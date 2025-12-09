// ============================================
// ADVANCED NLP CONVERSATIONAL - J.A.R.V.I.S. PURO
// ============================================
// NLP avanzado específico para conversación
//
// Características:
// ✅ Multi-turn intent detection
// ✅ Entity linking
// ✅ Coreference resolution
// ✅ Contextual confidence calculation
// ✅ Implicit intent detection
//
// Autor: Antropic Claude Sonnet 4.5
// Fecha: 2025-01-XX

class AdvancedNLPConversational {
  constructor(nlpEngine, conversationMemory) {
    this.nlpEngine = nlpEngine;
    this.conversationMemory = conversationMemory;

    // Configuración
    this.config = {
      maxContextTurns: 5,
      entityLinkingThreshold: 0.7,
      coreferenceThreshold: 0.6,
    };
  }

  async initialize() {
    console.log('[AdvancedNLPConversational] Inicializando NLP conversacional...');
    console.log('[AdvancedNLPConversational] Listo ✓');
    return true;
  }

  // ============================================
  // ANÁLISIS EN CONTEXTO
  // ============================================

  /**
   * Análisis completo de mensaje en contexto conversacional
   */
  async analyzeInContext(userMessage) {
    // 1. Análisis NLP básico
    const basicNLP = await this.nlpEngine.analyze(userMessage);

    // 2. Obtener contexto conversacional
    const context = this.conversationMemory.analyzeContext();

    // 3. Resolución de correferencias
    const coreferences = this.resolveCoreferences(userMessage, context);

    // 4. Entity linking
    const linkedEntities = this.linkEntities(basicNLP.entities || [], context);

    // 5. Intent refinement basado en contexto
    const refinedIntent = this.refineIntentWithContext(basicNLP, context);

    // 6. Detectar intent implícito
    const implicitIntent = this.detectImplicitIntent(userMessage, context);

    // 7. Calcular confianza contextual
    const contextualConfidence = this.calculateContextualConfidence(basicNLP, context);

    return {
      ...basicNLP,
      coreferences,
      linkedEntities,
      refinedIntent,
      implicitIntent,
      contextualConfidence,
    };
  }

  // ============================================
  // RESOLUCIÓN DE CORREFERENCIAS
  // ============================================

  /**
   * Resuelve correferencias (pronombres → antecedentes)
   */
  resolveCoreferences(message, context) {
    const coreferences = [];

    // Detectar pronombres y referencias
    const pronouns = ['eso', 'esto', 'aquello', 'él', 'ella', 'ellos', 'ellas', 'lo', 'la'];
    const demonstratives = ['ese', 'esa', 'este', 'esta', 'aquel', 'aquella'];

    const allReferences = [...pronouns, ...demonstratives];

    for (const pronoun of allReferences) {
      const regex = new RegExp(`\\b${pronoun}\\b`, 'gi');
      const matches = message.match(regex);

      if (matches) {
        // Buscar antecedente en contexto
        const antecedent = this.findAntecedent(pronoun, context);

        if (antecedent) {
          coreferences.push({
            reference: pronoun,
            antecedent: antecedent.value,
            type: antecedent.type,
            confidence: antecedent.confidence,
          });
        }
      }
    }

    return coreferences;
  }

  /**
   * Encuentra antecedente de una referencia
   */
  findAntecedent(pronoun, context) {
    const { implicitReferences } = context;

    // Mapeo de pronombres a tipos
    const pronounMap = {
      'eso': 'object',
      'esto': 'object',
      'aquello': 'object',
      'lo': 'object',
      'la': 'object',
      'él': 'person',
      'ella': 'person',
      'ellos': 'people',
      'ellas': 'people',
    };

    const type = pronounMap[pronoun.toLowerCase()] || 'object';

    // Buscar en referencias implícitas
    if (type === 'object') {
      const lastObject = implicitReferences?.eso || implicitReferences?.esto;
      if (lastObject) {
        return {
          value: lastObject,
          type: 'object',
          confidence: 0.8,
        };
      }

      // Buscar archivo mencionado
      const lastFile = implicitReferences?.['el archivo'];
      if (lastFile) {
        return {
          value: lastFile,
          type: 'file',
          confidence: 0.75,
        };
      }
    }

    // Buscar en entidades recientes
    const recentHistory = this.conversationMemory.getHistory(3);

    for (const turn of recentHistory.reverse()) {
      const entities = turn.context?.entities || {};

      for (const [entityType, entityValue] of Object.entries(entities)) {
        if (this.entityMatchesType(entityType, type)) {
          return {
            value: entityValue,
            type: entityType,
            confidence: 0.7,
          };
        }
      }
    }

    return null;
  }

  /**
   * Verifica si tipo de entidad coincide con tipo de pronombre
   */
  entityMatchesType(entityType, pronounType) {
    const typeMap = {
      'person': ['user', 'developer', 'author', 'person'],
      'object': ['file', 'directory', 'project', 'function', 'variable', 'class'],
      'people': ['users', 'developers', 'team'],
    };

    const matches = typeMap[pronounType] || [];

    return matches.includes(entityType);
  }

  // ============================================
  // ENTITY LINKING
  // ============================================

  /**
   * Liga entidades con contexto previo
   */
  linkEntities(entities, context) {
    const linked = [];

    for (const entity of entities) {
      // Buscar si esta entidad ya apareció antes
      const previous = this.findPreviousMention(entity, context);

      if (previous) {
        linked.push({
          ...entity,
          linkedTo: previous,
          isNew: false,
        });
      } else {
        linked.push({
          ...entity,
          isNew: true,
        });
      }
    }

    return linked;
  }

  /**
   * Busca mención previa de una entidad
   */
  findPreviousMention(entity, context) {
    const history = this.conversationMemory.getHistory(10);

    for (const turn of history.reverse()) {
      const entities = turn.context?.entities || {};

      for (const [type, value] of Object.entries(entities)) {
        if (this.entitiesAreSimilar(entity, { type, value })) {
          return { type, value, turn: turn.timestamp };
        }
      }
    }

    return null;
  }

  /**
   * Verifica si dos entidades son similares
   */
  entitiesAreSimilar(entity1, entity2) {
    if (entity1.type !== entity2.type) return false;

    const val1 = String(entity1.value || '').toLowerCase();
    const val2 = String(entity2.value || '').toLowerCase();

    // Exact match
    if (val1 === val2) return true;

    // Partial match (for file names, etc)
    if (val1.includes(val2) || val2.includes(val1)) {
      return true;
    }

    return false;
  }

  // ============================================
  // INTENT REFINEMENT
  // ============================================

  /**
   * Refina intent con contexto
   */
  refineIntentWithContext(nlpResult, context) {
    const { nextLikelyAction, currentTopic } = context;

    const intent = {
      action: nlpResult.questionType || 'unknown',
      confidence: 0.6,
      original: nlpResult.questionType,
    };

    // Si intent tiene baja confianza, usar nextLikelyAction
    if (intent.confidence < 0.5 && nextLikelyAction) {
      return {
        ...intent,
        action: nextLikelyAction,
        confidence: 0.6,
        refined: true,
        reason: 'predicted_from_pattern',
      };
    }

    // Si topic actual es relevante, ajustar intent
    if (currentTopic && this.isIntentRelatedToTopic(intent, currentTopic)) {
      return {
        ...intent,
        confidence: Math.min(intent.confidence + 0.1, 1.0),
        refined: true,
        reason: 'topic_alignment',
      };
    }

    return intent;
  }

  /**
   * Verifica si intent está relacionado con topic
   */
  isIntentRelatedToTopic(intent, topic) {
    const intentAction = intent.action || '';
    const topicLower = topic.toLowerCase();

    // Simple keyword matching
    return intentAction.toLowerCase().includes(topicLower) ||
           topicLower.includes(intentAction.toLowerCase());
  }

  // ============================================
  // IMPLICIT INTENT DETECTION
  // ============================================

  /**
   * Detecta intent implícito
   */
  detectImplicitIntent(message, context) {
    const trimmed = message.trim();

    // Mensajes muy cortos pueden tener intent implícito
    if (trimmed.length < 20) {
      const { nextLikelyAction } = context;

      // "sí" / "ok" / "dale" → confirmar acción anterior
      if (/^(s[ií]|ok|dale|hazlo|procede|adelante|claro)$/i.test(trimmed)) {
        return {
          type: 'confirmation',
          confirming: nextLikelyAction,
          confidence: 0.9,
        };
      }

      // "no" / "cancel" → cancelar acción anterior
      if (/^(no|cancel|abort|detener|para|espera)$/i.test(trimmed)) {
        return {
          type: 'negation',
          rejecting: nextLikelyAction,
          confidence: 0.9,
        };
      }

      // "help" / "ayuda" → pedir ayuda
      if (/^(ayuda|help|\?)$/i.test(trimmed)) {
        return {
          type: 'help_request',
          confidence: 0.95,
        };
      }
    }

    return null;
  }

  // ============================================
  // CONTEXTUAL CONFIDENCE
  // ============================================

  /**
   * Calcula confianza contextual
   */
  calculateContextualConfidence(nlpResult, context) {
    let confidence = 0.5;

    // Boost si intent alinea con nextLikelyAction
    if (context.nextLikelyAction === nlpResult.questionType) {
      confidence += 0.15;
    }

    // Boost si entities son conocidas
    const entities = nlpResult.entities || [];
    const knownEntities = entities.filter(e =>
      this.isEntityKnown(e, context)
    ).length;

    const totalEntities = entities.length || 1;
    const knownRatio = knownEntities / totalEntities;

    confidence += knownRatio * 0.1;

    // Boost si mensaje es largo y bien formado
    const wordCount = nlpResult.wordCount || 0;
    if (wordCount > 5) {
      confidence += 0.05;
    }

    // Boost si hay entidades detectadas
    if (entities.length > 0) {
      confidence += 0.1;
    }

    // Cap at 1.0
    return Math.min(confidence, 1.0);
  }

  /**
   * Verifica si entidad es conocida
   */
  isEntityKnown(entity, context) {
    return this.findPreviousMention(entity, context) !== null;
  }

  // ============================================
  // ESTADÍSTICAS
  // ============================================

  getStats() {
    return {
      initialized: true,
      config: this.config,
    };
  }
}

export default AdvancedNLPConversational;

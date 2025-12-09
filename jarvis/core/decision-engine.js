// core/decision-engine.js
// Motor de Decisión Autónoma - Toma decisiones sin intervención humana
// Combina razonamiento + NLP + memoria para actuar de forma inteligente

import ReasoningEngine from './reasoning-engine.js';
import NLPEngine from './nlp-engine.js';

class DecisionEngine {
  constructor(memory, personality) {
    this.memory = memory;
    this.personality = personality;
    this.reasoning = new ReasoningEngine(memory);
    this.nlp = new NLPEngine();

    // Contexto de conversación
    this.conversationContext = {
      lastMessage: null,
      lastAnalysis: null,
      lastAction: null,
      topic: null,
      followUpCount: 0
    };

    // Sistema de prioridades
    this.priorities = {
      user_safety: 10,      // Seguridad del usuario
      data_integrity: 9,    // Integridad de datos
      user_request: 8,      // Solicitud explícita
      system_health: 7,     // Salud del sistema
      optimization: 5,      // Optimización
      learning: 4,          // Aprendizaje
      proactive: 3          // Acciones proactivas
    };

    // Historial de decisiones
    this.decisionHistory = [];
  }

  /**
   * Procesa un mensaje del usuario y toma decisiones autónomas
   * Este es el núcleo de la inteligencia de J.A.R.V.I.S. PURO
   */
  async processAndDecide(userMessage) {
    console.log('\n🧠 [Decision Engine] Analizando mensaje...');

    // FASE 1: Análisis lingüístico (NLP)
    const nlpAnalysis = this.nlp.process(userMessage);
    console.log(`📝 [NLP] Complejidad: ${nlpAnalysis.metadata.wordCount} palabras, ${this.nlp.estimateComplexity(nlpAnalysis)}/10`);

    // FASE 2: Razonamiento lógico
    const reasoning = this.reasoning.analyze(userMessage);
    console.log(`🎯 [Reasoning] Intención: ${reasoning.intent.intent}, Confianza: ${(reasoning.confidence * 100).toFixed(0)}%`);

    // FASE 3: Análisis contextual (memoria)
    const context = await this.analyzeContext(userMessage, nlpAnalysis, reasoning);
    console.log(`🔍 [Context] Follow-up: ${context.isFollowUp}, Tema: ${context.topic || 'nuevo'}`);

    // FASE 4: Toma de decisión
    const decision = this.makeDecision({
      userMessage,
      nlp: nlpAnalysis,
      reasoning,
      context
    });

    console.log(`✅ [Decision] Acción: ${decision.chosenAction.type}, Confianza: ${(decision.confidence * 100).toFixed(0)}%`);

    // FASE 5: Generar respuesta
    const response = await this.generateResponse(decision);

    // FASE 6: Guardar en historial
    this.updateHistory(userMessage, decision, response);

    return {
      decision,
      response,
      analysis: {
        nlp: nlpAnalysis,
        reasoning,
        context
      }
    };
  }

  /**
   * Analiza el contexto usando memoria y conversación anterior
   */
  async analyzeContext(message, nlpAnalysis, reasoning) {
    const context = {
      isFollowUp: this.nlp.isFollowUp(message),
      topic: this.conversationContext.topic,
      relatedPastConversations: [],
      relevantPreferences: [],
      relevantProjects: []
    };

    // Si es follow-up, mantener el tema
    if (context.isFollowUp && this.conversationContext.topic) {
      context.topic = this.conversationContext.topic;
      this.conversationContext.followUpCount++;
    } else {
      // Determinar nuevo tema
      context.topic = this.determineTopic(nlpAnalysis, reasoning);
      this.conversationContext.followUpCount = 0;
    }

    // Buscar conversaciones relacionadas en memoria
    if (reasoning.intent.intent === 'remember' || nlpAnalysis.entities.memory?.length > 0) {
      // Aquí conectaríamos con memory-advanced para buscar
      context.needsMemoryLookup = true;
    }

    // Detectar si menciona proyectos conocidos
    if (reasoning.entities.some(e => e.entity === 'project')) {
      context.needsProjectInfo = true;
    }

    return context;
  }

  /**
   * Determina el tema de la conversación
   */
  determineTopic(nlpAnalysis, reasoning) {
    // Prioridad 1: Entidades detectadas
    if (reasoning.entities.length > 0) {
      return reasoning.entities[0].entity;
    }

    // Prioridad 2: Keywords principales
    if (reasoning.keywords.length > 0) {
      return reasoning.keywords[0].word;
    }

    // Prioridad 3: Intención
    return reasoning.intent.intent;
  }

  /**
   * TOMA DE DECISIÓN - El corazón del sistema
   */
  makeDecision(input) {
    const { userMessage, nlp, reasoning, context } = input;

    const decision = {
      timestamp: new Date(),
      confidence: 0,
      chosenAction: null,
      alternativeActions: [],
      reasoning: [],
      shouldAsk: false,  // Si necesita confirmación
      shouldExecute: true, // Si debe ejecutar inmediatamente
      riskLevel: 'low'  // low, medium, high
    };

    // PASO 1: Evaluar todas las acciones posibles
    const possibleActions = this.generatePossibleActions(input);

    // PASO 2: Evaluar riesgos de cada acción
    const evaluatedActions = possibleActions.map(action => ({
      ...action,
      risk: this.evaluateRisk(action, input),
      priority: this.calculatePriority(action, input),
      feasibility: this.checkFeasibility(action)
    }));

    // PASO 3: Aplicar reglas de decisión
    const filteredActions = this.applyDecisionRules(evaluatedActions, input);

    // PASO 4: Seleccionar la mejor acción
    const ranked = filteredActions.sort((a, b) => {
      // Ordenar por: prioridad > feasibility > (1 - risk)
      if (a.priority !== b.priority) return b.priority - a.priority;
      if (a.feasibility !== b.feasibility) return b.feasibility - a.feasibility;
      return a.risk - b.risk;
    });

    decision.chosenAction = ranked[0] || { type: 'ask_clarification', priority: 1, risk: 'low' };
    decision.alternativeActions = ranked.slice(1, 4);
    decision.confidence = this.calculateDecisionConfidence(decision.chosenAction, input);

    // PASO 5: Determinar si necesita confirmación
    decision.shouldAsk = this.needsConfirmation(decision.chosenAction, input);
    decision.riskLevel = decision.chosenAction.risk;

    // PASO 6: Explicar el razonamiento
    decision.reasoning = this.explainDecision(decision, input);

    return decision;
  }

  /**
   * Genera todas las acciones posibles basadas en el análisis
   */
  generatePossibleActions(input) {
    const actions = [];
    const { nlp, reasoning } = input;

    // Acciones basadas en intención
    const intentActions = this.actionsFromIntent(reasoning.intent.intent);
    actions.push(...intentActions);

    // Acciones basadas en entidades
    for (const entity of reasoning.entities) {
      const entityActions = this.actionsFromEntity(entity);
      actions.push(...entityActions);
    }

    // Acciones basadas en inferencias
    for (const inference of reasoning.inferences) {
      actions.push({
        type: inference.action,
        source: 'inference',
        priority: 7
      });
    }

    // Acciones basadas en comandos NLP
    for (const command of nlp.commands) {
      actions.push({
        type: `${command.verb}_${command.object.replace(/\s+/g, '_')}`,
        source: 'nlp_command',
        priority: 8
      });
    }

    // Siempre tener opción de pedir aclaración
    actions.push({
      type: 'ask_clarification',
      source: 'fallback',
      priority: 1
    });

    return actions;
  }

  /**
   * Acciones según intención detectada
   */
  actionsFromIntent(intent) {
    const mapping = {
      'create': [
        { type: 'create_file', priority: 7 },
        { type: 'create_project', priority: 8 },
        { type: 'generate_code', priority: 7 }
      ],
      'search': [
        { type: 'search_filesystem', priority: 9 },
        { type: 'search_memory', priority: 7 },
        { type: 'search_git', priority: 6 }
      ],
      'show': [
        { type: 'display_file', priority: 8 },
        { type: 'list_directory', priority: 8 },
        { type: 'show_stats', priority: 6 }
      ],
      'execute': [
        { type: 'run_command', priority: 9 },
        { type: 'run_script', priority: 8 }
      ],
      'analyze': [
        { type: 'diagnostic', priority: 8 },
        { type: 'code_review', priority: 7 },
        { type: 'system_check', priority: 7 }
      ],
      'remember': [
        { type: 'query_memory', priority: 9 },
        { type: 'show_history', priority: 7 }
      ],
      'help': [
        { type: 'provide_help', priority: 8 },
        { type: 'show_capabilities', priority: 6 }
      ]
    };

    return (mapping[intent] || []).map(a => ({ ...a, source: 'intent' }));
  }

  /**
   * Acciones según entidad detectada
   */
  actionsFromEntity(entity) {
    const mapping = {
      'git': [{ type: 'git_operation', priority: 7 }],
      'database': [{ type: 'db_query', priority: 7 }],
      'error': [{ type: 'error_diagnosis', priority: 9 }],
      'file': [{ type: 'file_operation', priority: 7 }],
      'project': [{ type: 'project_management', priority: 7 }]
    };

    return (mapping[entity.entity] || []).map(a => ({
      ...a,
      source: 'entity',
      entityData: entity
    }));
  }

  /**
   * Evalúa el riesgo de una acción
   */
  evaluateRisk(action, input) {
    // Acciones destructivas = alto riesgo
    const destructiveActions = ['delete_file', 'drop_database', 'force_push', 'kill_process'];
    if (destructiveActions.some(da => action.type.includes(da))) {
      return 'high';
    }

    // Ejecución de comandos arbitrarios = riesgo medio-alto
    if (action.type === 'run_command') {
      // Analizar el comando específico si está disponible
      if (input.nlp.entities.shellCommand?.length > 0) {
        const cmd = input.nlp.entities.shellCommand[0].value.toLowerCase();
        if (['rm', 'del', 'drop', 'kill'].some(dangerous => cmd.includes(dangerous))) {
          return 'high';
        }
      }
      return 'medium';
    }

    // Modificación de datos = riesgo medio
    if (['create', 'update', 'modify'].some(op => action.type.includes(op))) {
      return 'medium';
    }

    // Lectura/consulta = bajo riesgo
    return 'low';
  }

  /**
   * Calcula prioridad final de una acción
   */
  calculatePriority(action, input) {
    let priority = action.priority || 5;

    // Aumentar prioridad si hay alta urgencia
    if (input.reasoning.urgency >= 8) {
      priority += 2;
    }

    // Aumentar si hay sentimiento negativo (usuario frustrado)
    if (input.nlp.sentiment.polarity === 'negative') {
      priority += 1;
    }

    // Aumentar si es follow-up (mantener flujo de conversación)
    if (input.context.isFollowUp) {
      priority += 1;
    }

    return Math.min(10, priority);
  }

  /**
   * Verifica si una acción es factible
   */
  checkFeasibility(action) {
    // Por ahora, todas las acciones son factibles
    // En el futuro, verificar dependencias, permisos, etc.

    const feasibilityMap = {
      'search_filesystem': 1.0,
      'list_directory': 1.0,
      'display_file': 1.0,
      'run_command': 0.9,
      'query_memory': 1.0,
      'git_operation': 0.8,  // Depende de si hay repo Git
      'db_query': 0.7,       // Depende de DB configurada
      'send_email': 0.6,     // Depende de config email
    };

    return feasibilityMap[action.type] || 0.5;
  }

  /**
   * Aplica reglas de decisión para filtrar acciones
   */
  applyDecisionRules(actions, input) {
    return actions.filter(action => {
      // Regla 1: No ejecutar acciones de alto riesgo sin confirmación
      if (action.risk === 'high') {
        action.requiresConfirmation = true;
      }

      // Regla 2: Priorizar acciones específicas sobre genéricas
      if (action.source === 'nlp_command') {
        action.priority += 1;
      }

      // Regla 3: Si confianza del reasoning es baja, pedir aclaración
      if (input.reasoning.confidence < 0.5 && action.type !== 'ask_clarification') {
        return false;
      }

      // Regla 4: Si hay negación, invertir acción
      if (input.nlp.negation.hasNegation) {
        // Lógica especial para negaciones
        action.negated = true;
      }

      return action.feasibility > 0.3;
    });
  }

  /**
   * Calcula confianza en la decisión tomada
   */
  calculateDecisionConfidence(action, input) {
    let confidence = 0.5; // Base

    // Factor 1: Confianza del reasoning
    confidence += input.reasoning.confidence * 0.3;

    // Factor 2: Prioridad de la acción
    confidence += (action.priority / 10) * 0.2;

    // Factor 3: Factibilidad
    confidence += action.feasibility * 0.2;

    // Factor 4: Claridad del mensaje (menos complejidad = más confianza)
    const complexity = this.nlp.estimateComplexity(input.nlp);
    confidence += (1 - complexity / 10) * 0.1;

    // Factor 5: Si hay múltiples señales concordantes
    const signals = [
      input.reasoning.intent.intent !== 'unknown',
      input.reasoning.entities.length > 0,
      input.nlp.commands.length > 0
    ].filter(Boolean).length;

    confidence += (signals / 3) * 0.2;

    return Math.min(1.0, Math.max(0.1, confidence));
  }

  /**
   * Determina si necesita confirmación del usuario
   */
  needsConfirmation(action, input) {
    // Siempre confirmar acciones de alto riesgo
    if (action.risk === 'high') {
      return true;
    }

    // Confirmar si confianza en decisión es baja
    if (this.calculateDecisionConfidence(action, input) < 0.6) {
      return true;
    }

    // Confirmar acciones destructivas
    if (['delete', 'drop', 'kill', 'remove'].some(op => action.type.includes(op))) {
      return true;
    }

    return false;
  }

  /**
   * Explica el razonamiento de la decisión
   */
  explainDecision(decision, input) {
    const explanations = [];

    // Explicar por qué se eligió esta acción
    explanations.push(`Elegí '${decision.chosenAction.type}' porque:`);

    if (decision.chosenAction.source === 'intent') {
      explanations.push(`- La intención detectada fue '${input.reasoning.intent.intent}'`);
    }

    if (decision.chosenAction.source === 'nlp_command') {
      explanations.push(`- Se detectó un comando explícito en el mensaje`);
    }

    if (input.reasoning.urgency >= 8) {
      explanations.push(`- La urgencia es alta (${input.reasoning.urgency}/10)`);
    }

    if (decision.chosenAction.priority >= 8) {
      explanations.push(`- Es una acción de alta prioridad`);
    }

    if (decision.shouldAsk) {
      explanations.push(`- Se requiere confirmación por seguridad`);
    }

    return explanations;
  }

  /**
   * Genera la respuesta final al usuario
   */
  async generateResponse(decision) {
    const { chosenAction, confidence, shouldAsk, riskLevel, reasoning } = decision;

    const response = {
      message: '',
      tone: 'professional',
      shouldExecute: !shouldAsk,
      action: chosenAction,
      confidence,
      riskLevel
    };

    // Seleccionar tono basado en personalidad
    const tones = this.personality ? {
      'helpful_serious': [
        'Entiendo, Señor.',
        'Muy bien, Señor.',
        'Por supuesto, Señor.'
      ],
      'witty_default': [
        'Interesante solicitud, Señor.',
        'Como siempre, Señor.',
        'Permítame encargarme de eso.'
      ],
      'modest': [
        'Un placer ayudarle, Señor.',
        'Para eso estoy, Señor.'
      ]
    } : null;

    // Construir mensaje
    const greeting = tones?.witty_default?.[Math.floor(Math.random() * 3)] || 'Entendido.';

    response.message = `${greeting}\n\n`;

    // Agregar comprensión
    if (decision.reasoning && decision.reasoning.length > 0) {
      response.message += `${decision.reasoning[0]}\n`;
    }

    // Si necesita confirmación
    if (shouldAsk) {
      response.message += `\n⚠️  Esta acción requiere confirmación (riesgo: ${riskLevel}).\n`;
      response.message += `¿Desea que proceda con '${chosenAction.type}'?`;
    } else {
      response.message += `\nProcederé con: ${chosenAction.type}`;
    }

    // Agregar confianza si es baja
    if (confidence < 0.7) {
      response.message += `\n\n💡 (Confianza: ${(confidence * 100).toFixed(0)}% - Si no es lo que buscaba, por favor especifique más)`;
    }

    return response;
  }

  /**
   * Actualiza el historial de decisiones y contexto
   */
  updateHistory(message, decision, response) {
    this.decisionHistory.push({
      timestamp: new Date(),
      message,
      decision,
      response
    });

    // Mantener solo últimas 50 decisiones
    if (this.decisionHistory.length > 50) {
      this.decisionHistory.shift();
    }

    // Actualizar contexto
    this.conversationContext.lastMessage = message;
    this.conversationContext.lastAnalysis = decision;
    this.conversationContext.lastAction = decision.chosenAction;
  }

  /**
   * Genera sugerencias proactivas (JARVIS actúa sin que se lo pidan)
   */
  async generateProactiveSuggestions() {
    const suggestions = [];

    // Analizar historial de decisiones
    const recentActions = this.decisionHistory.slice(-10);

    // Sugerencia 1: Si hay muchos errores, ofrecer diagnóstico
    const errorCount = recentActions.filter(d =>
      d.decision?.chosenAction?.type?.includes('error')
    ).length;

    if (errorCount >= 3) {
      suggestions.push({
        type: 'diagnostic_recommendation',
        priority: 8,
        message: 'Señor, he notado múltiples errores recientes. ¿Desea que realice un diagnóstico completo del sistema?'
      });
    }

    // Sugerencia 2: Si no hay actividad en un proyecto, recordar
    // (aquí conectaríamos con memoria para detectar proyectos inactivos)

    // Sugerencia 3: Optimizaciones detectadas
    // (análisis de patrones de uso)

    return suggestions;
  }

  /**
   * Método de auto-reflexión (JARVIS analiza sus propias decisiones)
   */
  async selfReflect() {
    const insights = {
      successRate: 0,
      commonPatterns: [],
      areasOfImprovement: []
    };

    if (this.decisionHistory.length < 5) {
      return insights;
    }

    // Calcular tasa de éxito (basado en si requirieron confirmación)
    const successful = this.decisionHistory.filter(d =>
      !d.decision.shouldAsk && d.decision.confidence > 0.7
    ).length;

    insights.successRate = successful / this.decisionHistory.length;

    // Detectar patrones comunes
    const actionTypes = this.decisionHistory.map(d => d.decision.chosenAction.type);
    const frequencies = {};

    for (const type of actionTypes) {
      frequencies[type] = (frequencies[type] || 0) + 1;
    }

    insights.commonPatterns = Object.entries(frequencies)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([type, count]) => ({ type, count }));

    // Áreas de mejora
    if (insights.successRate < 0.7) {
      insights.areasOfImprovement.push('Mejorar confianza en decisiones');
    }

    return insights;
  }
}

export default DecisionEngine;

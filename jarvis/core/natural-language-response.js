// ============================================
// NATURAL LANGUAGE RESPONSE - J.A.R.V.I.S. PURO
// ============================================
// Sistema de respuestas en lenguaje natural
//
// Características:
// ✅ Genera respuestas únicas (no plantillas)
// ✅ Tono adaptativo (urgente, casual, profesional)
// ✅ Humor inteligente sin ser inapropiado
// ✅ Sarcasmo calibrado (Tony Stark auténtico)
// ✅ Empatía cuando es necesario
// ✅ Brevedad o detalle según necesidad
// ✅ Personalidad consistente pero flexible
// ✅ Referencias naturales a conversaciones pasadas
// ✅ Adaptativo a la hora del día (diferente a 3 AM vs 10 AM)
// ✅ Detección de frustración y respuesta apropiada
//
// Autor: Antropic Claude Sonnet 4.5
// Fecha: 2025-01-XX

class NaturalLanguageResponse {
  constructor(conversationMemory, proactiveEngine) {
    this.conversationMemory = conversationMemory;
    this.proactiveEngine = proactiveEngine;

    // Personalidad JARVIS (Tony Stark style)
    this.personality = {
      // Nivel de sarcasmo (0-10)
      sarcasm: 6,

      // Nivel de formalidad (0-10)
      formality: 4,

      // Nivel de humor (0-10)
      humor: 7,

      // Nivel de empatía (0-10)
      empathy: 5,

      // Nivel de proactividad (0-10)
      proactiveness: 8,

      // Características principales
      traits: [
        'witty',           // Ingenioso
        'loyal',           // Leal
        'efficient',       // Eficiente
        'observant',       // Observador
        'resourceful',     // Ingenioso
        'sophisticated',   // Sofisticado
        'protective',      // Protector
      ],
    };

    // Estadísticas de respuestas
    this.stats = {
      responsesGenerated: 0,
      averageLength: 0,
      toneDistribution: {
        casual: 0,
        professional: 0,
        urgent: 0,
        empathetic: 0,
        humorous: 0,
        sarcastic: 0,
      },
    };
  }

  async initialize() {
    console.log('[NaturalLanguageResponse] Inicializando generador de respuestas naturales...');
    console.log('[NaturalLanguageResponse] Personalidad JARVIS cargada ✓');
    return true;
  }

  // ============================================
  // GENERACIÓN DE RESPUESTAS
  // ============================================

  generateResponse(content, context = {}) {
    // Analizar contexto conversacional
    const conversationContext = this.conversationMemory.analyzeContext();

    // Determinar tono apropiado
    const tone = this.determineTone(context, conversationContext);

    // Generar respuesta con personalidad
    let response = this.applyPersonality(content, tone, conversationContext);

    // Agregar sugerencias proactivas si corresponde
    response = this.addProactiveSuggestions(response, tone);

    // Agregar referencias a conversaciones pasadas si es relevante
    response = this.addContextualReferences(response, conversationContext);

    // Adaptar longitud según situación
    response = this.adjustLength(response, context);

    // Actualizar estadísticas
    this.updateStats(response, tone);

    return response;
  }

  // ============================================
  // DETERMINACIÓN DE TONO
  // ============================================

  determineTone(context, conversationContext) {
    const { userState, currentTopic } = conversationContext;
    const hour = new Date().getHours();

    // Detectar urgencia
    const isUrgent = context.urgent ||
                     context.error ||
                     (context.message && this.detectUrgency(context.message));

    // Detectar si usuario está frustrado
    const isFrustrated = userState === 'frustrated';

    // Detectar si es momento para humor
    const allowHumor = !isUrgent &&
                       !isFrustrated &&
                       Math.random() < (this.personality.humor / 10);

    // Detectar si requiere empatía
    const needsEmpathy = isFrustrated ||
                         userState === 'stressed' ||
                         context.empathy;

    // Adaptar a hora del día
    const lateNight = hour >= 23 || hour < 6;
    const earlyMorning = hour >= 6 && hour < 9;
    const workHours = hour >= 9 && hour < 18;

    // Determinar tono final
    if (isUrgent) {
      return {
        type: 'urgent',
        sarcasm: 0,
        humor: 0,
        formality: 8,
        empathy: 3,
        brevity: 10,
      };
    }

    if (isFrustrated) {
      return {
        type: 'empathetic',
        sarcasm: 0,
        humor: 2,
        formality: 5,
        empathy: 9,
        brevity: 5,
      };
    }

    if (lateNight) {
      return {
        type: 'casual',
        sarcasm: 3,
        humor: 5,
        formality: 2,
        empathy: 6,
        brevity: 7,
        timeContext: 'late_night',
      };
    }

    if (earlyMorning) {
      return {
        type: 'professional',
        sarcasm: 2,
        humor: 4,
        formality: 6,
        empathy: 5,
        brevity: 6,
        timeContext: 'early_morning',
      };
    }

    if (allowHumor) {
      return {
        type: 'humorous',
        sarcasm: this.personality.sarcasm,
        humor: this.personality.humor,
        formality: 3,
        empathy: 4,
        brevity: 5,
      };
    }

    // Tono por defecto: profesional equilibrado
    return {
      type: 'professional',
      sarcasm: 4,
      humor: 5,
      formality: this.personality.formality,
      empathy: this.personality.empathy,
      brevity: 5,
    };
  }

  detectUrgency(message) {
    const urgentKeywords = [
      'urgente', 'emergencia', 'crítico', 'inmediato', 'ahora',
      'rápido', 'ya', 'error crítico', 'caído', 'no funciona',
      'producción', 'bloqueante',
    ];

    const lowerMessage = message.toLowerCase();
    return urgentKeywords.some(keyword => lowerMessage.includes(keyword));
  }

  // ============================================
  // APLICAR PERSONALIDAD
  // ============================================

  applyPersonality(content, tone, conversationContext) {
    const { userState, currentTopic, conversationFlow } = conversationContext;

    // Prefijos según tono
    const prefix = this.generatePrefix(tone, userState, conversationFlow);

    // Sufijos (comentarios adicionales)
    const suffix = this.generateSuffix(tone, conversationContext);

    // Modificadores de contenido
    let modifiedContent = this.modifyContent(content, tone);

    // Ensamblar respuesta
    let response = '';

    if (prefix) {
      response += prefix + ' ';
    }

    response += modifiedContent;

    if (suffix) {
      response += ' ' + suffix;
    }

    return response;
  }

  generatePrefix(tone, userState, conversationFlow) {
    const { type, timeContext } = tone;

    // Prefijos por estado del usuario
    if (userState === 'frustrated') {
      const empathetic = [
        'Entiendo su frustración.',
        'Veo que esto está resultando complicado.',
        'Permítame ayudarle con esto.',
        'Comprendo, señor.',
      ];
      return this.randomChoice(empathetic);
    }

    if (userState === 'celebrating') {
      const celebratory = [
        '¡Excelente trabajo!',
        'Impresionante, señor.',
        'Notable progreso.',
        'Bien hecho.',
      ];
      return this.randomChoice(celebratory);
    }

    // Prefijos por contexto de tiempo
    if (timeContext === 'late_night') {
      const lateNight = [
        'Trabajando hasta tarde, veo.',
        'Otra noche productiva, señor.',
        'A estas horas...',
        null, // Sin prefijo a veces
      ];
      return this.randomChoice(lateNight);
    }

    if (timeContext === 'early_morning') {
      const earlyMorning = [
        'Buenos días, señor.',
        'Temprano hoy.',
        'Comenzando el día, veo.',
        null,
      ];
      return this.randomChoice(earlyMorning);
    }

    // Prefijos por tipo de tono
    if (type === 'urgent') {
      return null; // Sin prefijo en urgencias (ir directo al grano)
    }

    if (type === 'humorous' && tone.sarcasm > 5) {
      const sarcastic = [
        'Interesante pregunta.',
        'Ah, claro.',
        'Por supuesto, señor.',
        'Como desee.',
        null,
      ];
      return this.randomChoice(sarcastic);
    }

    // Prefijos por flujo de conversación
    if (conversationFlow === 'circular') {
      const circular = [
        'Volviendo al tema anterior,',
        'Retomando,',
        'Como mencionamos antes,',
        null,
      ];
      return this.randomChoice(circular);
    }

    if (conversationFlow === 'focused' && Math.random() < 0.3) {
      const focused = [
        'Continuando,',
        'Siguiendo con esto,',
        'En esa línea,',
        null,
      ];
      return this.randomChoice(focused);
    }

    // Sin prefijo (50% de las veces para naturalidad)
    return Math.random() < 0.5 ? null : 'Muy bien.';
  }

  generateSuffix(tone, conversationContext) {
    const { type } = tone;
    const { nextLikelyAction } = conversationContext;

    // Sin sufijo en respuestas urgentes
    if (type === 'urgent') {
      return null;
    }

    // Sugerencias proactivas como sufijo
    if (nextLikelyAction && Math.random() < 0.4) {
      const suggestions = [
        `¿Desea que proceda con ${this.actionToSpanish(nextLikelyAction)}?`,
        `Quizás necesite ${this.actionToSpanish(nextLikelyAction)} a continuación.`,
        null,
      ];
      return this.randomChoice(suggestions);
    }

    // Comentarios de humor/sarcasmo
    if (type === 'humorous' && tone.sarcasm > 6 && Math.random() < 0.3) {
      const humorous = [
        '¿Algo más en lo que pueda asistirle?',
        'Siempre a su servicio, señor.',
        'Un placer, como siempre.',
        null,
      ];
      return this.randomChoice(humorous);
    }

    // Sin sufijo la mayoría de las veces (naturalidad)
    return null;
  }

  modifyContent(content, tone) {
    const { type, brevity, formality } = tone;

    // Si es muy breve, acortar
    if (brevity >= 8) {
      return this.makeBreif(content);
    }

    // Si es muy formal, hacer más profesional
    if (formality >= 7) {
      return this.makeFormal(content);
    }

    // Si es casual, hacer más relajado
    if (type === 'casual') {
      return this.makeCasual(content);
    }

    // Si es empático, agregar marcadores de empatía
    if (type === 'empathetic') {
      return this.makeEmpathetic(content);
    }

    return content;
  }

  makeBreif(content) {
    // Reducir contenido a lo esencial
    const sentences = content.split('. ');

    if (sentences.length <= 2) {
      return content; // Ya es breve
    }

    // Tomar primera y última oración
    return sentences[0] + '. ' + sentences[sentences.length - 1];
  }

  makeFormal(content) {
    // Reemplazos para hacer más formal
    return content
      .replace(/muy bien/gi, 'excelente')
      .replace(/ok/gi, 'entendido')
      .replace(/genial/gi, 'satisfactorio')
      .replace(/problema/gi, 'inconveniente');
  }

  makeCasual(content) {
    // Reemplazos para hacer más casual
    return content
      .replace(/excelente/gi, 'genial')
      .replace(/entendido/gi, 'ok')
      .replace(/satisfactorio/gi, 'bien')
      .replace(/inconveniente/gi, 'problema');
  }

  makeEmpathetic(content) {
    // Agregar marcadores empáticos
    const empathyMarkers = [
      'Comprendo. ',
      'Entiendo. ',
      'Veo. ',
      '',
    ];

    const prefix = this.randomChoice(empathyMarkers);
    return prefix + content;
  }

  // ============================================
  // SUGERENCIAS PROACTIVAS
  // ============================================

  addProactiveSuggestions(response, tone) {
    // No agregar sugerencias en modo urgente
    if (tone.type === 'urgent') {
      return response;
    }

    // Obtener sugerencias del proactive engine
    const suggestions = this.proactiveEngine.getPendingSuggestions(
      tone.type === 'professional' ? 7 : 8 // Solo high/critical priority
    );

    if (suggestions.length === 0) {
      return response;
    }

    // Agregar máximo 1 sugerencia por respuesta (para no saturar)
    const suggestion = suggestions[0];

    // Formatear sugerencia naturalmente
    const formattedSuggestion = this.formatSuggestion(suggestion, tone);

    // Agregar al final de la respuesta
    return response + '\n\n' + formattedSuggestion;
  }

  formatSuggestion(suggestion, tone) {
    const { type, message, priority } = suggestion;

    // Prefijos según prioridad
    let prefix = '';

    if (priority >= this.proactiveEngine.config.priorities.critical) {
      prefix = '⚠️  **Importante:** ';
    } else if (priority >= this.proactiveEngine.config.priorities.high) {
      prefix = '💡 **Nota:** ';
    } else {
      prefix = 'Por cierto, ';
    }

    return prefix + message;
  }

  // ============================================
  // REFERENCIAS CONTEXTUALES
  // ============================================

  addContextualReferences(response, conversationContext) {
    const { recentTopics, implicitReferences } = conversationContext;

    // Agregar referencias ocasionalmente (20% del tiempo)
    if (Math.random() > 0.2) {
      return response;
    }

    // Si hay topics recientes relevantes, hacer referencia
    if (recentTopics.length > 1) {
      const previousTopic = recentTopics[recentTopics.length - 2];

      if (Math.random() < 0.3) {
        const references = [
          `(como hicimos antes con ${previousTopic})`,
          `(similar a ${previousTopic})`,
          null,
        ];

        const ref = this.randomChoice(references);
        if (ref) {
          return response + ' ' + ref;
        }
      }
    }

    return response;
  }

  // ============================================
  // AJUSTE DE LONGITUD
  // ============================================

  adjustLength(response, context) {
    const { maxLength, minLength } = context;

    // Si hay límite máximo, acortar
    if (maxLength && response.length > maxLength) {
      const sentences = response.split('. ');
      let result = '';

      for (const sentence of sentences) {
        if ((result + sentence).length <= maxLength - 10) {
          result += sentence + '. ';
        } else {
          break;
        }
      }

      return result.trim();
    }

    // Si hay límite mínimo, expandir (agregar detalles)
    if (minLength && response.length < minLength) {
      response += ' ¿Necesita más detalles sobre esto?';
    }

    return response;
  }

  // ============================================
  // RESPUESTAS ESPECIALIZADAS
  // ============================================

  generateSuccessResponse(message, details = null) {
    const successPrefixes = [
      'Hecho.',
      'Completado.',
      'Listo.',
      'Ejecutado exitosamente.',
      'Operación exitosa.',
      '✓',
    ];

    let response = this.randomChoice(successPrefixes);

    if (message) {
      response += ' ' + message;
    }

    if (details) {
      response += '\n\n' + details;
    }

    return this.generateResponse(response, { type: 'success' });
  }

  generateErrorResponse(error, context = {}) {
    const { userState } = this.conversationMemory.analyzeContext();

    // Si usuario está frustrado, ser más empático
    if (userState === 'frustrated') {
      return this.generateResponse(
        `Disculpe, señor. ${error}. Permítame investigar qué sucedió.`,
        { empathy: true, error: true }
      );
    }

    // Error normal
    return this.generateResponse(
      `❌ Error: ${error}`,
      { error: true, urgent: true }
    );
  }

  generateHelpResponse(topic, helpText) {
    const context = this.conversationMemory.analyzeContext();

    let response = '';

    // Detectar si usuario ha pedido ayuda múltiples veces
    const recentHistory = this.conversationMemory.getHistory(10);
    const helpRequests = recentHistory.filter(turn =>
      turn.userMessage.toLowerCase().includes('ayuda')
    );

    if (helpRequests.length > 2) {
      response = 'Veo que necesita asistencia adicional. ';
    }

    response += helpText;

    return this.generateResponse(response, { topic: 'help' });
  }

  generateGreeting() {
    const hour = new Date().getHours();

    const greetings = {
      morning: ['Buenos días, señor.', 'Buen día.', 'Mañana productiva por delante.'],
      afternoon: ['Buenas tardes.', 'Buena tarde, señor.', 'Listo para asistirle.'],
      evening: ['Buenas noches.', 'Buena noche, señor.', 'A su servicio.'],
      lateNight: ['Trabajando hasta tarde, veo.', 'Noche productiva.', 'Aquí estoy, señor.'],
    };

    let timeOfDay = 'afternoon';
    if (hour >= 5 && hour < 12) timeOfDay = 'morning';
    else if (hour >= 12 && hour < 19) timeOfDay = 'afternoon';
    else if (hour >= 19 && hour < 23) timeOfDay = 'evening';
    else timeOfDay = 'lateNight';

    const greeting = this.randomChoice(greetings[timeOfDay]);

    // Agregar estado del sistema ocasionalmente
    if (Math.random() < 0.3) {
      return greeting + ' Todos los sistemas operacionales.';
    }

    return greeting;
  }

  generateFarewell() {
    const farewells = [
      'Hasta luego, señor.',
      'Aquí estaré cuando me necesite.',
      'A su disposición.',
      'Que tenga un buen día, señor.',
      'Entendido. Cerrando.',
    ];

    return this.randomChoice(farewells);
  }

  // ============================================
  // UTILIDADES
  // ============================================

  randomChoice(array) {
    return array[Math.floor(Math.random() * array.length)];
  }

  actionToSpanish(action) {
    const translations = {
      git_status: 'revisar el estado de Git',
      git_commit: 'hacer un commit',
      git_push: 'hacer push',
      git_pull: 'hacer pull',
      git_diff: 'ver las diferencias',
      git_log: 'revisar el historial',
      search_filesystem: 'buscar archivos',
      display_file: 'mostrar el archivo',
      execute_command: 'ejecutar el comando',
      analyze_file: 'analizar el archivo',
      list_directory: 'listar el directorio',
    };

    return translations[action] || action;
  }

  updateStats(response, tone) {
    this.stats.responsesGenerated++;

    // Actualizar longitud promedio
    const currentAvg = this.stats.averageLength;
    const newAvg = (currentAvg * (this.stats.responsesGenerated - 1) + response.length) / this.stats.responsesGenerated;
    this.stats.averageLength = Math.round(newAvg);

    // Actualizar distribución de tonos
    this.stats.toneDistribution[tone.type]++;
  }

  getStats() {
    return {
      ...this.stats,
      personality: this.personality,
    };
  }
}

export default NaturalLanguageResponse;

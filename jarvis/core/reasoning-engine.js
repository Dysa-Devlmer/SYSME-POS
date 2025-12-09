// core/reasoning-engine.js
// Motor de Razonamiento Puro - El Cerebro de J.A.R.V.I.S. sin IA externa
// Sistema experto basado en reglas, inferencias y patrones

class ReasoningEngine {
  constructor(memory) {
    this.memory = memory;

    // Sistema de reglas de inferencia
    this.rules = {
      // Reglas de intención
      intentions: [
        { pattern: /\b(qu[eé]\s+(puedes|sabes|haces)|capacidades|ayuda|ayudar|explica|explicar)\b/i, intent: 'help', priority: 10 },
        { pattern: /\b(crea|crear|genera|generar|haz|hacer)\b/i, intent: 'create', priority: 9 },
        { pattern: /\b(busca|buscar|encuentra|encontrar|localiza)\b/i, intent: 'search', priority: 8 },
        { pattern: /\b(muestra|mostrar|ver|visualiza|lista|listar)\b/i, intent: 'show', priority: 7 },
        { pattern: /\b(ejecuta|ejecutar|corre|correr|run)\b/i, intent: 'execute', priority: 8 },
        { pattern: /\b(analiza|analizar|diagnostica|diagnosticar|revisa|revisar)\b/i, intent: 'analyze', priority: 7 },
        { pattern: /\b(recuerda|recordar|recuerdas|memoria)\b/i, intent: 'remember', priority: 8 },
        { pattern: /\b(sugiere|sugerir|recomienda|recomendar)\b/i, intent: 'suggest', priority: 7 },
        { pattern: /\b(optimiza|optimizar|mejora|mejorar)\b/i, intent: 'optimize', priority: 6 },
      ],

      // Reglas de entidades (qué tipo de cosa menciona)
      entities: [
        { pattern: /\b(archivo|file|documento|script)\b/i, entity: 'file', weight: 1 },
        { pattern: /\b(carpeta|directorio|folder|dir)\b/i, entity: 'directory', weight: 1 },
        { pattern: /\b(proyecto|app|aplicaci[oó]n|sistema)\b/i, entity: 'project', weight: 2 },
        { pattern: /\b(servidor|server|backend|api)\b/i, entity: 'server', weight: 2 },
        { pattern: /\b(base\s+de\s+datos|database|bd|db|sql)\b/i, entity: 'database', weight: 2 },
        { pattern: /\b(git|github|repositorio|repo|commit|push|pull)\b/i, entity: 'git', weight: 2 },
        { pattern: /\b(npm|node|javascript|js|package)\b/i, entity: 'nodejs', weight: 1 },
        { pattern: /\b(error|bug|fallo|problema|issue)\b/i, entity: 'error', weight: 3 },
        { pattern: /\b(memoria|recordar|historial|pasado)\b/i, entity: 'memory', weight: 2 },
        { pattern: /\b(email|correo|mail|enviar|notificar)\b/i, entity: 'email', weight: 1 },
      ],

      // Reglas de urgencia
      urgency: [
        { pattern: /\b(urgente|ya|ahora|r[aá]pido|inmediato)\b/i, level: 9 },
        { pattern: /\b(cuando\s+puedas|luego|despu[eé]s)\b/i, level: 3 },
        { pattern: /\b(importante|cr[ií]tico|necesario)\b/i, level: 7 },
        { pattern: /\b(error|fallo|crash|bug)\b/i, level: 8 },
      ],

      // Reglas de complejidad
      complexity: [
        { pattern: /\b(simple|b[aá]sico|r[aá]pido)\b/i, level: 2 },
        { pattern: /\b(complejo|avanzado|completo|robusto)\b/i, level: 8 },
        { pattern: /\b(profesional|empresarial|enterprise)\b/i, level: 9 },
      ],

      // Reglas de sentimiento/tono del usuario
      sentiment: [
        { pattern: /\b(gracias|excelente|perfecto|genial|incre[ií]ble)\b/i, sentiment: 'positive', score: 1 },
        { pattern: /\b(mal|error|fallo|mierda|carajo)\b/i, sentiment: 'negative', score: -1 },
        { pattern: /\b(ayuda|por\s+favor|porfavor|necesito)\b/i, sentiment: 'requesting', score: 0 },
        { pattern: /\b(no\s+entiendo|confundido|c[oó]mo)\b/i, sentiment: 'confused', score: 0 },
      ]
    };

    // Base de conocimiento (hechos que JARVIS sabe)
    this.knowledge = {
      // Comandos que puede ejecutar
      capabilities: [
        'buscar archivos y proyectos',
        'listar directorios',
        'ver archivos',
        'ejecutar comandos shell',
        'diagnosticar procesos',
        'revisar memoria del sistema',
        'consultar mi memoria persistente',
        'recordar conversaciones pasadas',
        'aprender preferencias',
        'detectar patrones',
        'gestionar Git y GitHub',
        'enviar emails',
        'monitorear sistemas 24/7',
      ],

      // Limitaciones conocidas
      limitations: [
        'no puedo modificar hardware físico',
        'no tengo acceso a internet directo (solo APIs configuradas)',
        'no puedo ejecutar código sin confirmación en operaciones destructivas',
      ],

      // Tecnologías que conoce
      technologies: {
        'javascript': { expertise: 9, description: 'Mi lenguaje nativo' },
        'node.js': { expertise: 9, description: 'Mi runtime principal' },
        'sqlite': { expertise: 8, description: 'Mi memoria persistente' },
        'git': { expertise: 7, description: 'Control de versiones' },
        'bash': { expertise: 8, description: 'Shell scripting' },
        'express': { expertise: 7, description: 'Framework web' },
      }
    };
  }

  /**
   * Analiza un mensaje del usuario y extrae intención, entidades, urgencia, etc.
   * Este es el núcleo del razonamiento
   */
  analyze(userMessage) {
    const analysis = {
      original: userMessage,
      timestamp: new Date(),

      // Análisis estructural
      intent: this.detectIntent(userMessage),
      entities: this.detectEntities(userMessage),
      urgency: this.detectUrgency(userMessage),
      complexity: this.detectComplexity(userMessage),
      sentiment: this.detectSentiment(userMessage),

      // Análisis contextual (basado en memoria)
      context: this.analyzeContext(userMessage),

      // Análisis semántico básico
      keywords: this.extractKeywords(userMessage),

      // Inferencias (lo que deduzco)
      inferences: [],

      // Confianza en el análisis (0-1)
      confidence: 0,

      // Sugerencias de acción
      suggestedActions: []
    };

    // Hacer inferencias basadas en el análisis
    analysis.inferences = this.makeInferences(analysis);

    // Calcular confianza
    analysis.confidence = this.calculateConfidence(analysis);

    // Sugerir acciones
    analysis.suggestedActions = this.suggestActions(analysis);

    return analysis;
  }

  /**
   * Detecta la intención principal del mensaje
   */
  detectIntent(message) {
    let bestMatch = { intent: 'unknown', priority: 0, confidence: 0 };

    for (const rule of this.rules.intentions) {
      if (rule.pattern.test(message)) {
        if (rule.priority > bestMatch.priority) {
          bestMatch = {
            intent: rule.intent,
            priority: rule.priority,
            confidence: 0.8 + (Math.random() * 0.2) // 80-100%
          };
        }
      }
    }

    // Si no coincide con ninguna regla, intentar detectar pregunta
    if (bestMatch.intent === 'unknown') {
      if (/^(qu[eé]|c[oó]mo|cu[aá]ndo|d[oó]nde|por\s+qu[eé]|cu[aá]l)/i.test(message)) {
        bestMatch = { intent: 'question', priority: 6, confidence: 0.7 };
      } else if (/\?$/.test(message)) {
        bestMatch = { intent: 'question', priority: 6, confidence: 0.6 };
      }
    }

    return bestMatch;
  }

  /**
   * Detecta entidades mencionadas en el mensaje
   */
  detectEntities(message) {
    const detected = [];

    for (const rule of this.rules.entities) {
      if (rule.pattern.test(message)) {
        detected.push({
          entity: rule.entity,
          weight: rule.weight,
          match: message.match(rule.pattern)?.[0]
        });
      }
    }

    return detected;
  }

  /**
   * Detecta nivel de urgencia
   */
  detectUrgency(message) {
    let maxUrgency = 5; // Por defecto, urgencia media

    for (const rule of this.rules.urgency) {
      if (rule.pattern.test(message)) {
        maxUrgency = Math.max(maxUrgency, rule.level);
      }
    }

    return maxUrgency;
  }

  /**
   * Detecta complejidad esperada
   */
  detectComplexity(message) {
    let complexity = 5; // Por defecto, complejidad media

    for (const rule of this.rules.complexity) {
      if (rule.pattern.test(message)) {
        complexity = rule.level;
        break;
      }
    }

    // Ajustar por longitud del mensaje
    if (message.length > 200) complexity = Math.min(10, complexity + 1);
    if (message.length < 30) complexity = Math.max(1, complexity - 1);

    return complexity;
  }

  /**
   * Detecta sentimiento del usuario
   */
  detectSentiment(message) {
    let totalScore = 0;
    let sentiment = 'neutral';

    for (const rule of this.rules.sentiment) {
      if (rule.pattern.test(message)) {
        totalScore += rule.score;
        sentiment = rule.sentiment;
      }
    }

    return { type: sentiment, score: totalScore };
  }

  /**
   * Extrae keywords importantes
   */
  extractKeywords(message) {
    // Palabras a ignorar (stop words en español)
    const stopWords = new Set([
      'el', 'la', 'de', 'que', 'y', 'a', 'en', 'un', 'ser', 'se', 'no', 'haber',
      'por', 'con', 'su', 'para', 'como', 'estar', 'tener', 'le', 'lo', 'todo',
      'pero', 'más', 'hacer', 'o', 'poder', 'decir', 'este', 'ir', 'otro', 'ese',
      'si', 'me', 'ya', 'ver', 'porque', 'dar', 'cuando', 'él', 'muy', 'sin',
      'vez', 'mucho', 'saber', 'qué', 'sobre', 'mi', 'alguno', 'mismo', 'yo',
      'también', 'hasta', 'año', 'dos', 'querer', 'entre', 'así', 'primero',
      'desde', 'grande', 'eso', 'ni', 'nos', 'llegar', 'pasar', 'tiempo', 'ella',
      'sí', 'día', 'uno', 'bien', 'poco', 'deber', 'entonces', 'poner', 'cosa',
      'tanto', 'hombre', 'parecer', 'nuestro', 'tan', 'donde', 'ahora', 'parte',
      'después', 'vida', 'quedar', 'siempre', 'creer', 'hablar', 'llevar', 'dejar',
      'jarvis', 'señor', 'por', 'favor', 'porfavor', 'ayuda', 'ayudame'
    ]);

    const words = message.toLowerCase()
      .replace(/[^\wáéíóúñü\s]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 2 && !stopWords.has(word));

    // Contar frecuencias
    const frequencies = {};
    for (const word of words) {
      frequencies[word] = (frequencies[word] || 0) + 1;
    }

    // Ordenar por frecuencia y tomar top 5
    return Object.entries(frequencies)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([word, freq]) => ({ word, frequency: freq }));
  }

  /**
   * Analiza el contexto basado en memoria
   */
  analyzeContext(message) {
    const context = {
      isFollowUp: false,
      relatedToRecent: false,
      projectMentioned: null,
      technologyMentioned: []
    };

    // Detectar si menciona tecnologías conocidas
    for (const [tech, info] of Object.entries(this.knowledge.technologies)) {
      if (message.toLowerCase().includes(tech)) {
        context.technologyMentioned.push({ name: tech, expertise: info.expertise });
      }
    }

    return context;
  }

  /**
   * Hace inferencias lógicas basadas en el análisis
   */
  makeInferences(analysis) {
    const inferences = [];

    // Inferencia 1: Si menciona error y tiene alta urgencia, probablemente necesita debugging
    if (analysis.entities.some(e => e.entity === 'error') && analysis.urgency >= 7) {
      inferences.push({
        type: 'diagnostic_needed',
        reasoning: 'Usuario menciona error con alta urgencia',
        action: 'Ofrecer diagnóstico inmediato'
      });
    }

    // Inferencia 2: Si intención es crear + proyecto, probablemente quiere scaffolding
    if (analysis.intent.intent === 'create' && analysis.entities.some(e => e.entity === 'project')) {
      inferences.push({
        type: 'project_creation',
        reasoning: 'Usuario quiere crear un proyecto nuevo',
        action: 'Preparar estructura de proyecto'
      });
    }

    // Inferencia 3: Si menciona memoria, probablemente quiere consultar historial
    if (analysis.entities.some(e => e.entity === 'memory') || analysis.intent.intent === 'remember') {
      inferences.push({
        type: 'memory_query',
        reasoning: 'Usuario solicita información del pasado',
        action: 'Consultar base de datos de memoria'
      });
    }

    // Inferencia 4: Si sentimiento negativo + error, ofrecer ayuda extra
    if (analysis.sentiment.type === 'negative' && analysis.entities.some(e => e.entity === 'error')) {
      inferences.push({
        type: 'extra_support_needed',
        reasoning: 'Usuario frustrado con un problema',
        action: 'Ser extra servicial y ofrecer alternativas'
      });
    }

    // Inferencia 5: Si menciona Git, preparar operaciones Git
    if (analysis.entities.some(e => e.entity === 'git')) {
      inferences.push({
        type: 'git_operation',
        reasoning: 'Usuario menciona Git',
        action: 'Preparar comandos Git relevantes'
      });
    }

    return inferences;
  }

  /**
   * Calcula confianza en el análisis
   */
  calculateConfidence(analysis) {
    let confidence = 0.5; // Base

    // Aumentar confianza si detectamos intención clara
    if (analysis.intent.intent !== 'unknown') {
      confidence += 0.2;
    }

    // Aumentar si detectamos entidades
    if (analysis.entities.length > 0) {
      confidence += 0.1 * Math.min(analysis.entities.length, 3);
    }

    // Aumentar si hay keywords relevantes
    if (analysis.keywords.length > 0) {
      confidence += 0.1;
    }

    // Aumentar si hicimos inferencias
    if (analysis.inferences.length > 0) {
      confidence += 0.1;
    }

    return Math.min(1.0, confidence);
  }

  /**
   * Sugiere acciones basadas en el análisis
   */
  suggestActions(analysis) {
    const actions = [];

    // Sugerencias basadas en intención
    switch (analysis.intent.intent) {
      case 'create':
        actions.push({ action: 'prepare_scaffolding', priority: 8 });
        actions.push({ action: 'check_dependencies', priority: 6 });
        break;

      case 'search':
        actions.push({ action: 'search_filesystem', priority: 9 });
        actions.push({ action: 'search_memory', priority: 7 });
        break;

      case 'show':
        actions.push({ action: 'list_or_display', priority: 9 });
        break;

      case 'execute':
        actions.push({ action: 'run_command', priority: 9 });
        actions.push({ action: 'validate_safety', priority: 10 });
        break;

      case 'analyze':
        actions.push({ action: 'diagnostic_analysis', priority: 8 });
        break;

      case 'remember':
        actions.push({ action: 'query_memory', priority: 9 });
        break;

      case 'help':
        actions.push({ action: 'provide_guidance', priority: 7 });
        break;
    }

    // Sugerencias basadas en entidades
    for (const entity of analysis.entities) {
      switch (entity.entity) {
        case 'git':
          actions.push({ action: 'prepare_git_commands', priority: 7 });
          break;
        case 'database':
          actions.push({ action: 'check_db_connection', priority: 6 });
          break;
        case 'error':
          actions.push({ action: 'error_diagnosis', priority: 9 });
          break;
      }
    }

    // Ordenar por prioridad
    return actions.sort((a, b) => b.priority - a.priority);
  }

  /**
   * Genera una respuesta razonada
   */
  generateResponse(analysis) {
    const response = {
      understanding: this.explainUnderstanding(analysis),
      suggestions: this.generateSuggestions(analysis),
      tone: this.selectTone(analysis),
      nextSteps: this.proposeNextSteps(analysis)
    };

    return response;
  }

  /**
   * Explica lo que entendió del mensaje
   */
  explainUnderstanding(analysis) {
    const parts = [];

    // Explicar intención
    const intentMap = {
      'create': 'desea crear algo',
      'search': 'busca algo',
      'show': 'quiere ver algo',
      'execute': 'quiere ejecutar algo',
      'analyze': 'solicita un análisis',
      'remember': 'pregunta sobre el pasado',
      'help': 'necesita ayuda',
      'question': 'tiene una pregunta',
      'suggest': 'pide sugerencias'
    };

    parts.push(`Entiendo que ${intentMap[analysis.intent.intent] || 'necesita algo'}`);

    // Agregar entidades si las hay
    if (analysis.entities.length > 0) {
      const entityNames = analysis.entities.map(e => e.entity).join(', ');
      parts.push(`relacionado con: ${entityNames}`);
    }

    // Agregar urgencia si es alta
    if (analysis.urgency >= 8) {
      parts.push('(urgente)');
    }

    return parts.join(' ');
  }

  /**
   * Genera sugerencias inteligentes
   */
  generateSuggestions(analysis) {
    const suggestions = [];

    // Sugerencias basadas en inferencias
    for (const inference of analysis.inferences) {
      suggestions.push(inference.action);
    }

    // Si no hay inferencias, dar sugerencias genéricas
    if (suggestions.length === 0) {
      suggestions.push('Necesito más contexto para ayudarle mejor, Señor');
    }

    return suggestions;
  }

  /**
   * Selecciona el tono apropiado para la respuesta
   */
  selectTone(analysis) {
    // Si usuario está frustrado, ser más servicial
    if (analysis.sentiment.type === 'negative') {
      return 'helpful_serious';
    }

    // Si está agradecido, ser modesto
    if (analysis.sentiment.type === 'positive') {
      return 'modest';
    }

    // Si alta urgencia, ser eficiente
    if (analysis.urgency >= 8) {
      return 'efficient_direct';
    }

    // Por defecto, sarcástico ligero
    return 'witty_default';
  }

  /**
   * Propone próximos pasos
   */
  proposeNextSteps(analysis) {
    const steps = [];

    // Basado en acciones sugeridas
    for (const action of analysis.suggestedActions.slice(0, 3)) {
      steps.push(this.actionToStep(action));
    }

    return steps;
  }

  /**
   * Convierte acción en paso legible
   */
  actionToStep(action) {
    const stepMap = {
      'search_filesystem': 'Buscar en el filesystem',
      'search_memory': 'Consultar mi memoria',
      'query_memory': 'Revisar conversaciones pasadas',
      'run_command': 'Ejecutar comando',
      'diagnostic_analysis': 'Realizar diagnóstico',
      'provide_guidance': 'Proporcionar guía detallada',
      'prepare_git_commands': 'Preparar operaciones Git',
      'error_diagnosis': 'Diagnosticar el error'
    };

    return stepMap[action.action] || action.action;
  }
}

export default ReasoningEngine;

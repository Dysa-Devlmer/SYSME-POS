// core/nlp-engine.js
// Motor NLP Puro - Procesamiento de Lenguaje Natural sin APIs externas
// Análisis lingüístico basado en patrones, regex y heurísticas

class NLPEngine {
  constructor() {
    // Diccionario de sinónimos para normalización
    this.synonyms = {
      // Verbos de acción
      'crear': ['crear', 'generar', 'hacer', 'construir', 'desarrollar', 'inicializar'],
      'buscar': ['buscar', 'encontrar', 'localizar', 'ubicar', 'hallar'],
      'mostrar': ['mostrar', 'ver', 'visualizar', 'listar', 'displayar', 'enseñar'],
      'ejecutar': ['ejecutar', 'correr', 'run', 'lanzar', 'iniciar'],
      'analizar': ['analizar', 'diagnosticar', 'revisar', 'examinar', 'inspeccionar'],
      'ayudar': ['ayudar', 'asistir', 'apoyar', 'auxiliar'],
      'recordar': ['recordar', 'memoria', 'pasado', 'anterior', 'histórico'],
      'sugerir': ['sugerir', 'recomendar', 'aconsejar', 'proponer'],
      'optimizar': ['optimizar', 'mejorar', 'perfeccionar', 'refinar'],
      'eliminar': ['eliminar', 'borrar', 'quitar', 'remover', 'delete'],
      'actualizar': ['actualizar', 'update', 'modificar', 'cambiar', 'editar'],
      'instalar': ['instalar', 'install', 'setup', 'configurar'],
      'explicar': ['explicar', 'aclarar', 'detallar', 'describir'],

      // Sustantivos comunes
      'archivo': ['archivo', 'file', 'fichero', 'documento'],
      'carpeta': ['carpeta', 'directorio', 'folder', 'dir'],
      'proyecto': ['proyecto', 'app', 'aplicación', 'sistema', 'programa'],
      'servidor': ['servidor', 'server', 'backend', 'api'],
      'base_datos': ['base de datos', 'database', 'bd', 'db'],
      'error': ['error', 'bug', 'fallo', 'problema', 'issue'],
      'código': ['código', 'code', 'script', 'source'],
      'comando': ['comando', 'command', 'instrucción'],

      // Adjetivos/modificadores
      'rápido': ['rápido', 'fast', 'quick', 'veloz'],
      'lento': ['lento', 'slow'],
      'completo': ['completo', 'full', 'total', 'entero'],
      'simple': ['simple', 'básico', 'sencillo', 'fácil'],
      'complejo': ['complejo', 'avanzado', 'complicado', 'difícil'],
    };

    // Patrones de entidades nombradas
    this.entityPatterns = {
      // Rutas de archivos
      filepath: [
        /([A-Z]:\\[\w\s\-\.\\]+)/g, // Windows: C:\path\to\file
        /(\/[\w\s\-\.\/]+)/g,        // Unix: /path/to/file
        /\b([\w\-]+\.(js|json|md|txt|py|java|cpp|cs|html|css|sql|bat|sh))\b/gi, // Archivos: nombre.extensión
      ],

      // URLs
      url: [
        /(https?:\/\/[^\s]+)/g,
        /(www\.[^\s]+)/g,
      ],

      // Emails
      email: [
        /([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/g,
      ],

      // Números
      number: [
        /\b(\d+)\b/g,
      ],

      // Comandos shell (detectar cuando menciona comandos específicos)
      shellCommand: [
        /\b(npm|node|git|python|java|docker|ls|cd|mkdir|rm|cp|mv)\s+[a-z]+/gi,
      ],

      // Nombres de paquetes npm
      npmPackage: [
        /\b(express|react|vue|angular|next|nestjs|axios|lodash|moment)\b/gi,
      ],

      // Tecnologías
      technology: [
        /\b(javascript|typescript|python|java|c\+\+|ruby|go|rust|php|node\.?js|react|vue|angular|express|django|flask|spring|\.net)\b/gi,
      ],

      // Fechas
      date: [
        /\b(\d{1,2}[-\/]\d{1,2}[-\/]\d{2,4})\b/g,
        /\b(enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|octubre|noviembre|diciembre)\s+\d{1,2}/gi,
      ],
    };

    // Patrones de pregunta
    this.questionPatterns = {
      what: /^(qu[eé]|qu[eé]\s+es|cu[aá]l|cu[aá]les)\b/i,
      how: /^(c[oó]mo|de\s+qu[eé]\s+manera)\b/i,
      when: /^(cu[aá]ndo|en\s+qu[eé]\s+momento)\b/i,
      where: /^(d[oó]nde|en\s+qu[eé]\s+lugar)\b/i,
      why: /^(por\s+qu[eé]|cu[aá]l\s+es\s+la\s+raz[oó]n)\b/i,
      who: /^(qui[eé]n|qui[eé]nes)\b/i,
      which: /^(cu[aá]l|cu[aá]les)\b/i,
      yesno: /^(es|está|tiene|puede|puedo|debo|hay)\b/i,
    };

    // Modificadores temporales
    this.timeModifiers = {
      past: ['ayer', 'antes', 'anterior', 'pasado', 'previo', 'último'],
      present: ['ahora', 'hoy', 'actualmente', 'en este momento'],
      future: ['mañana', 'después', 'siguiente', 'próximo', 'luego'],
      immediate: ['ya', 'inmediatamente', 'urgente', 'ahora mismo'],
    };
  }

  /**
   * Procesa un texto completo y extrae toda la información lingüística
   */
  process(text) {
    return {
      original: text,
      normalized: this.normalize(text),
      tokens: this.tokenize(text),
      entities: this.extractEntities(text),
      questionType: this.detectQuestionType(text),
      timeReference: this.detectTimeReference(text),
      negation: this.detectNegation(text),
      commands: this.extractCommands(text),
      sentiment: this.analyzeSentiment(text),
      metadata: {
        length: text.length,
        wordCount: this.countWords(text),
        hasCode: this.detectCode(text),
        language: 'es' // Por ahora solo español
      }
    };
  }

  /**
   * Normaliza el texto (minúsculas, acentos, etc.)
   */
  normalize(text) {
    return text
      .toLowerCase()
      .replace(/[áàäâ]/g, 'a')
      .replace(/[éèëê]/g, 'e')
      .replace(/[íìïî]/g, 'i')
      .replace(/[óòöô]/g, 'o')
      .replace(/[úùüû]/g, 'u')
      .trim();
  }

  /**
   * Tokeniza el texto en palabras y frases
   */
  tokenize(text) {
    // Separar en oraciones
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);

    // Separar en palabras
    const words = text
      .toLowerCase()
      .replace(/[^\wáéíóúñü\s]/g, ' ')
      .split(/\s+/)
      .filter(w => w.length > 0);

    // Identificar palabras clave (no stop words)
    const stopWords = new Set([
      'el', 'la', 'de', 'que', 'y', 'a', 'en', 'un', 'ser', 'se', 'no',
      'por', 'con', 'su', 'para', 'como', 'estar', 'tener', 'le', 'lo',
      'pero', 'más', 'o', 'poder', 'este', 'si', 'me', 'ya', 'muy',
      'jarvis', 'señor'
    ]);

    const keywords = words.filter(w => !stopWords.has(w) && w.length > 2);

    return {
      sentences,
      words,
      keywords,
      count: {
        sentences: sentences.length,
        words: words.length,
        keywords: keywords.length
      }
    };
  }

  /**
   * Extrae entidades del texto usando patrones
   */
  extractEntities(text) {
    const entities = {};

    for (const [entityType, patterns] of Object.entries(this.entityPatterns)) {
      entities[entityType] = [];

      for (const pattern of patterns) {
        const matches = text.matchAll(pattern);
        for (const match of matches) {
          entities[entityType].push({
            value: match[0],
            position: match.index
          });
        }
      }
    }

    return entities;
  }

  /**
   * Detecta el tipo de pregunta
   */
  detectQuestionType(text) {
    if (!text.includes('?') && !/^(qu[eé]|c[oó]mo|cu[aá]ndo|d[oó]nde|por\s+qu[eé])/i.test(text)) {
      return { isQuestion: false, type: null };
    }

    for (const [type, pattern] of Object.entries(this.questionPatterns)) {
      if (pattern.test(text)) {
        return { isQuestion: true, type };
      }
    }

    return { isQuestion: true, type: 'general' };
  }

  /**
   * Detecta referencias temporales
   */
  detectTimeReference(text) {
    const references = {
      past: false,
      present: false,
      future: false,
      immediate: false
    };

    const normalized = this.normalize(text);

    for (const [timeType, keywords] of Object.entries(this.timeModifiers)) {
      for (const keyword of keywords) {
        if (normalized.includes(keyword)) {
          references[timeType] = true;
        }
      }
    }

    return references;
  }

  /**
   * Detecta negaciones
   */
  detectNegation(text) {
    const negationPatterns = [
      /\bno\s+/i,
      /\bnunca\s+/i,
      /\bningún/i,
      /\bninguna/i,
      /\bni\s+/i,
      /\bjamás\s+/i,
      /\btampoco\s+/i,
    ];

    for (const pattern of negationPatterns) {
      if (pattern.test(text)) {
        return {
          hasNegation: true,
          pattern: pattern.source
        };
      }
    }

    return { hasNegation: false };
  }

  /**
   * Extrae comandos implícitos del texto
   */
  extractCommands(text) {
    const commands = [];

    // Buscar verbos de acción + objeto
    const actionPattern = /\b(crea|busca|muestra|ejecuta|lista|analiza|instala|actualiza|elimina)\s+([a-záéíóúñ\s]+)/gi;
    const matches = text.matchAll(actionPattern);

    for (const match of matches) {
      commands.push({
        verb: match[1].toLowerCase(),
        object: match[2].trim(),
        fullMatch: match[0]
      });
    }

    return commands;
  }

  /**
   * Análisis de sentimiento básico
   */
  analyzeSentiment(text) {
    const positiveWords = [
      'gracias', 'excelente', 'perfecto', 'genial', 'increíble', 'bueno',
      'bien', 'mejor', 'fantástico', 'maravilloso', 'estupendo', 'súper'
    ];

    const negativeWords = [
      'mal', 'error', 'fallo', 'problema', 'horrible', 'pésimo',
      'terrible', 'desastre', 'mierda', 'joder', 'carajo', 'malo'
    ];

    const normalized = this.normalize(text);

    let score = 0;

    for (const word of positiveWords) {
      if (normalized.includes(word)) score += 1;
    }

    for (const word of negativeWords) {
      if (normalized.includes(word)) score -= 1;
    }

    // Detectar frustración (muchos signos de exclamación, mayúsculas)
    const exclamations = (text.match(/!/g) || []).length;
    const upperCaseRatio = (text.match(/[A-Z]/g) || []).length / text.length;

    if (exclamations > 2 || upperCaseRatio > 0.3) {
      score -= 0.5;
    }

    return {
      score,
      polarity: score > 0 ? 'positive' : score < 0 ? 'negative' : 'neutral',
      intensity: Math.abs(score),
      frustrated: exclamations > 2 || upperCaseRatio > 0.3
    };
  }

  /**
   * Cuenta palabras (excluyendo stop words)
   */
  countWords(text) {
    return text.split(/\s+/).filter(w => w.length > 0).length;
  }

  /**
   * Detecta si el texto contiene código
   */
  detectCode(text) {
    const codePatterns = [
      /```[\s\S]*?```/,           // Markdown code blocks
      /`[^`]+`/,                  // Inline code
      /function\s+\w+\s*\(/,      // JavaScript functions
      /class\s+\w+/,              // Classes
      /def\s+\w+\s*\(/,           // Python functions
      /import\s+[\w\s,{}]+from/,  // ES6 imports
      /require\s*\(/,             // CommonJS require
      /console\.log\s*\(/,        // Console logs
      /\b(const|let|var)\s+\w+\s*=/,  // Variable declarations
      /[{}\[\]();]/,              // Brackets/braces (simple check)
    ];

    for (const pattern of codePatterns) {
      if (pattern.test(text)) {
        return true;
      }
    }

    return false;
  }

  /**
   * Extrae parámetros de un comando
   * Ej: "busca archivos .js en src/" -> {extension: '.js', path: 'src/'}
   */
  extractParameters(text) {
    const params = {};

    // Buscar extensiones de archivo
    const extMatch = text.match(/\.\w{2,4}\b/);
    if (extMatch) {
      params.extension = extMatch[0];
    }

    // Buscar rutas
    const pathMatch = text.match(/en\s+([\/\w\-\.]+)/i);
    if (pathMatch) {
      params.path = pathMatch[1];
    }

    // Buscar nombres
    const nameMatch = text.match(/llamado\s+["']?(\w+)["']?/i);
    if (nameMatch) {
      params.name = nameMatch[1];
    }

    // Buscar cantidades
    const quantityMatch = text.match(/(\d+)\s+(archivos?|resultados?|items?)/i);
    if (quantityMatch) {
      params.quantity = parseInt(quantityMatch[1]);
    }

    return params;
  }

  /**
   * Encuentra el verbo principal de la oración
   */
  findMainVerb(text) {
    const verbPatterns = [
      { pattern: /^(crea|crear)/i, verb: 'crear' },
      { pattern: /^(busca|buscar)/i, verb: 'buscar' },
      { pattern: /^(muestra|mostrar|ver)/i, verb: 'mostrar' },
      { pattern: /^(ejecuta|ejecutar)/i, verb: 'ejecutar' },
      { pattern: /^(lista|listar)/i, verb: 'listar' },
      { pattern: /^(analiza|analizar)/i, verb: 'analizar' },
      { pattern: /^(instala|instalar)/i, verb: 'instalar' },
      { pattern: /^(actualiza|actualizar)/i, verb: 'actualizar' },
      { pattern: /^(elimina|eliminar|borrar)/i, verb: 'eliminar' },
      { pattern: /^(explica|explicar)/i, verb: 'explicar' },
      { pattern: /^(ayuda|ayudar)/i, verb: 'ayudar' },
    ];

    for (const { pattern, verb } of verbPatterns) {
      if (pattern.test(text)) {
        return verb;
      }
    }

    return null;
  }

  /**
   * Detecta el objeto directo de una acción
   * Ej: "busca archivos Python" -> "archivos Python"
   */
  findDirectObject(text) {
    const verb = this.findMainVerb(text);
    if (!verb) return null;

    // Remover el verbo y obtener el resto
    const withoutVerb = text.replace(new RegExp(`^${verb}\\s+`, 'i'), '');

    // El objeto suele ser lo que queda hasta la primera preposición
    const match = withoutVerb.match(/^([^,]+?)(?:\s+(?:en|de|con|para|por|que)\s+|$)/i);

    return match ? match[1].trim() : withoutVerb.trim();
  }

  /**
   * Simplifica una oración compleja a su forma más simple
   */
  simplify(text) {
    const verb = this.findMainVerb(text);
    const object = this.findDirectObject(text);
    const params = this.extractParameters(text);

    return {
      verb,
      object,
      params,
      simplified: verb && object ? `${verb} ${object}` : text
    };
  }

  /**
   * Detecta si el mensaje es una continuación de la conversación anterior
   */
  isFollowUp(text) {
    const followUpIndicators = [
      /^(también|además|y|ahora|luego|después)/i,
      /^(eso|esto|aquello|lo\s+mismo)/i,
      /^(sí|claro|ok|vale|perfecto)/i,
      /^(no|nunca|jamás|tampoco)/i,
    ];

    for (const pattern of followUpIndicators) {
      if (pattern.test(text)) {
        return true;
      }
    }

    // Si es muy corto (menos de 20 chars) probablemente es follow-up
    if (text.length < 20 && !text.includes('?')) {
      return true;
    }

    return false;
  }

  /**
   * Genera un resumen del procesamiento
   */
  generateSummary(processed) {
    return {
      mainAction: processed.commands[0] || null,
      isQuestion: processed.questionType.isQuestion,
      timeContext: Object.keys(processed.timeReference).find(k => processed.timeReference[k]) || 'present',
      sentiment: processed.sentiment.polarity,
      complexity: this.estimateComplexity(processed),
      entities: Object.keys(processed.entities).filter(k => processed.entities[k].length > 0)
    };
  }

  /**
   * Estima la complejidad de una solicitud
   */
  estimateComplexity(processed) {
    let complexity = 1; // Base

    // Más oraciones = más complejo
    complexity += processed.tokens.count.sentences * 0.5;

    // Más keywords = más complejo
    complexity += processed.tokens.count.keywords * 0.2;

    // Código detectado = más complejo
    if (processed.metadata.hasCode) {
      complexity += 2;
    }

    // Múltiples comandos = más complejo
    complexity += processed.commands.length * 0.5;

    // Múltiples entidades = más complejo
    const entityCount = Object.values(processed.entities)
      .reduce((sum, arr) => sum + arr.length, 0);
    complexity += entityCount * 0.3;

    return Math.min(10, Math.round(complexity));
  }
}

export default NLPEngine;

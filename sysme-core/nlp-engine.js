/**
 * JARVIS Mark VII v2.1.0 - NLP Engine
 * Motor de Procesamiento de Lenguaje Natural
 *
 * Capacidades:
 * - Análisis de intenciones
 * - Extracción de entidades
 * - Análisis de sentimiento
 * - Generación de respuestas
 *
 * @module NLPEngine
 * @version 2.1.0
 */

class NLPEngine {
  constructor(config = {}) {
    this.config = {
      language: config.language || 'es',
      confidence_threshold: config.confidence_threshold || 0.6,
      ...config
    };

    // Patrones de intenciones en español
    this.intentPatterns = {
      greeting: {
        patterns: [
          /^(hola|buenos días|buenas tardes|buenas noches|hey|saludos)/i,
          /^(qué tal|cómo estás|cómo está)/i
        ],
        confidence: 0.9
      },
      farewell: {
        patterns: [
          /^(adiós|chao|hasta luego|nos vemos|bye)/i,
          /^(que estés bien|cuídate|hasta pronto)/i
        ],
        confidence: 0.9
      },
      query_sales: {
        patterns: [
          /(ventas?|vendido|ingresos?) (de|del|hoy|ayer|semana|mes)/i,
          /(cuánto|cuántas?) (se ha|hemos) (vendido|ingresado)/i,
          /reporte (de )?ventas/i
        ],
        confidence: 0.8
      },
      query_inventory: {
        patterns: [
          /(stock|inventario|productos?|artículos?) (disponibles?|en stock)/i,
          /(cuánto|cuántos?) (queda|quedan|tenemos) (de|del)/i,
          /estado (del )?(stock|inventario)/i
        ],
        confidence: 0.8
      },
      create_order: {
        patterns: [
          /(crear|nueva|registrar) (venta|orden|pedido)/i,
          /(vender|cobrar) (un|una)/i,
          /nueva (transacción|compra)/i
        ],
        confidence: 0.8
      },
      help: {
        patterns: [
          /^(ayuda|help|auxilio|socorro)/i,
          /(cómo|como) (uso|utilizo|funciona)/i,
          /(qué|que) (puedo|puedes) (hacer|ayudarme)/i
        ],
        confidence: 0.9
      },
      unknown: {
        patterns: [],
        confidence: 0.3
      }
    };

    // Entidades comunes
    this.entityPatterns = {
      date: {
        patterns: [
          /\b(hoy|ayer|mañana)\b/i,
          /\b(esta|próxima|pasada) (semana|mes)\b/i,
          /\b\d{1,2}\/\d{1,2}\/\d{2,4}\b/
        ]
      },
      number: {
        patterns: [
          /\b\d+\b/,
          /\b(uno|dos|tres|cuatro|cinco|seis|siete|ocho|nueve|diez)\b/i
        ]
      },
      currency: {
        patterns: [
          /\$\s?\d+([.,]\d{3})*([.,]\d{2})?/,
          /\b\d+([.,]\d{3})*([.,]\d{2})?\s?(pesos|clp|dólares|usd)/i
        ]
      },
      product: {
        patterns: [
          /\b[A-ZÁÉÍÓÚÑ][a-záéíóúñ]+(\s[A-ZÁÉÍÓÚÑ][a-záéíóúñ]+)*\b/
        ]
      }
    };

    // Palabras de sentimiento
    this.sentimentWords = {
      positive: [
        'excelente', 'perfecto', 'genial', 'fantástico', 'bueno', 'bien',
        'gracias', 'agradezco', 'feliz', 'contento', 'satisfecho', 'ok'
      ],
      negative: [
        'malo', 'pésimo', 'horrible', 'terrible', 'problema', 'error',
        'falla', 'no funciona', 'roto', 'difícil', 'complicado', 'lento'
      ],
      neutral: [
        'normal', 'regular', 'así así', 'más o menos', 'puede ser'
      ]
    };
  }

  /**
   * Analiza un texto de entrada
   */
  async analyze(text) {
    try {
      if (!text || typeof text !== 'string') {
        throw new Error('Texto inválido');
      }

      const normalizedText = this.normalize(text);

      const analysis = {
        original: text,
        normalized: normalizedText,
        intent: await this.detectIntent(normalizedText),
        entities: await this.extractEntities(normalizedText),
        sentiment: await this.analyzeSentiment(normalizedText),
        tokens: this.tokenize(normalizedText),
        confidence: 0,
        timestamp: Date.now()
      };

      // Calcular confianza general
      analysis.confidence = this.calculateOverallConfidence(analysis);

      return analysis;
    } catch (error) {
      console.error('❌ Error analizando texto:', error);
      return {
        error: error.message,
        original: text
      };
    }
  }

  /**
   * Normaliza el texto
   */
  normalize(text) {
    return text
      .trim()
      .replace(/\s+/g, ' ') // Múltiples espacios a uno
      .replace(/[¿?!¡]+/g, '') // Eliminar signos de interrogación/exclamación extras
      .toLowerCase();
  }

  /**
   * Detecta la intención del texto
   */
  async detectIntent(text) {
    let bestMatch = {
      intent: 'unknown',
      confidence: 0,
      matches: []
    };

    for (const [intentName, intentData] of Object.entries(this.intentPatterns)) {
      for (const pattern of intentData.patterns) {
        const match = text.match(pattern);
        if (match) {
          const confidence = intentData.confidence;
          if (confidence > bestMatch.confidence) {
            bestMatch = {
              intent: intentName,
              confidence,
              matches: [match[0]]
            };
          }
        }
      }
    }

    // Si no hay match, es unknown
    if (bestMatch.confidence === 0) {
      bestMatch = {
        intent: 'unknown',
        confidence: 0.3,
        matches: []
      };
    }

    return bestMatch;
  }

  /**
   * Extrae entidades del texto
   */
  async extractEntities(text) {
    const entities = {};

    for (const [entityType, entityData] of Object.entries(this.entityPatterns)) {
      const matches = [];

      for (const pattern of entityData.patterns) {
        const match = text.match(pattern);
        if (match) {
          matches.push({
            value: match[0],
            position: match.index
          });
        }
      }

      if (matches.length > 0) {
        entities[entityType] = matches;
      }
    }

    return entities;
  }

  /**
   * Analiza el sentimiento del texto
   */
  async analyzeSentiment(text) {
    let positiveScore = 0;
    let negativeScore = 0;
    let neutralScore = 0;

    // Contar palabras de sentimiento
    for (const word of this.sentimentWords.positive) {
      if (text.includes(word)) {
        positiveScore++;
      }
    }

    for (const word of this.sentimentWords.negative) {
      if (text.includes(word)) {
        negativeScore++;
      }
    }

    for (const word of this.sentimentWords.neutral) {
      if (text.includes(word)) {
        neutralScore++;
      }
    }

    // Determinar sentimiento dominante
    let sentiment = 'neutral';
    let score = 0.5;

    if (positiveScore > negativeScore && positiveScore > neutralScore) {
      sentiment = 'positive';
      score = Math.min(0.5 + (positiveScore * 0.1), 1.0);
    } else if (negativeScore > positiveScore && negativeScore > neutralScore) {
      sentiment = 'negative';
      score = Math.max(0.5 - (negativeScore * 0.1), 0.0);
    } else {
      sentiment = 'neutral';
      score = 0.5;
    }

    return {
      sentiment,
      score,
      breakdown: {
        positive: positiveScore,
        negative: negativeScore,
        neutral: neutralScore
      }
    };
  }

  /**
   * Tokeniza el texto
   */
  tokenize(text) {
    return text
      .split(/\s+/)
      .filter(token => token.length > 0)
      .map(token => token.replace(/[.,;:!?¿¡]/g, ''));
  }

  /**
   * Calcula confianza general del análisis
   */
  calculateOverallConfidence(analysis) {
    const weights = {
      intent: 0.5,
      entities: 0.3,
      sentiment: 0.2
    };

    let confidence = 0;

    // Confianza de intención
    confidence += analysis.intent.confidence * weights.intent;

    // Confianza de entidades (más entidades = más confianza)
    const entityCount = Object.keys(analysis.entities).length;
    const entityConfidence = Math.min(entityCount * 0.2, 1.0);
    confidence += entityConfidence * weights.entities;

    // Confianza de sentimiento
    confidence += Math.abs(analysis.sentiment.score - 0.5) * 2 * weights.sentiment;

    return Math.min(confidence, 1.0);
  }

  /**
   * Genera respuesta basada en análisis
   */
  async generateResponse(analysis) {
    const intent = analysis.intent.intent;

    const responses = {
      greeting: [
        '¡Hola! ¿En qué puedo ayudarte hoy?',
        '¡Buenos días! Estoy aquí para asistirte.',
        '¡Hola! ¿Qué necesitas?'
      ],
      farewell: [
        '¡Hasta luego! Que tengas un excelente día.',
        '¡Adiós! Aquí estaré cuando me necesites.',
        '¡Nos vemos! Cuídate.'
      ],
      query_sales: [
        'Consultando las ventas... Un momento por favor.',
        'Voy a revisar las ventas para ti.',
        'Obteniendo información de ventas...'
      ],
      query_inventory: [
        'Revisando el inventario actual...',
        'Consultando el stock disponible...',
        'Verificando productos en inventario...'
      ],
      create_order: [
        '¿Qué producto deseas vender?',
        'Iniciando nueva venta. ¿Qué necesitas agregar?',
        'Listo para registrar la venta.'
      ],
      help: [
        'Puedo ayudarte con:\n- Consultar ventas\n- Revisar inventario\n- Crear órdenes\n- Reportes\n¿Qué necesitas?',
        'Estoy aquí para ayudarte. ¿Qué necesitas saber?',
        'Puedo asistirte con ventas, inventario y reportes. ¿Qué prefieres?'
      ],
      unknown: [
        'No estoy seguro de entender. ¿Puedes reformular?',
        'Disculpa, no comprendí. ¿Podrías ser más específico?',
        '¿Podrías explicar mejor lo que necesitas?'
      ]
    };

    const intentResponses = responses[intent] || responses.unknown;
    const response = intentResponses[Math.floor(Math.random() * intentResponses.length)];

    return {
      text: response,
      intent: intent,
      confidence: analysis.confidence,
      requiresAction: !['greeting', 'farewell', 'help', 'unknown'].includes(intent)
    };
  }

  /**
   * Procesa texto y genera respuesta completa
   */
  async process(text) {
    const analysis = await this.analyze(text);
    const response = await this.generateResponse(analysis);

    return {
      analysis,
      response,
      timestamp: Date.now()
    };
  }
}

module.exports = NLPEngine;

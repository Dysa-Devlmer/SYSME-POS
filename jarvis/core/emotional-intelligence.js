// ============================================
// EMOTIONAL INTELLIGENCE - J.A.R.V.I.S. PURO
// ============================================
// Detección y respuesta a emociones del usuario
//
// Características:
// ✅ Detección de emociones en mensajes (frustrated, stressed, happy, etc.)
// ✅ Análisis de tendencias emocionales
// ✅ Generación de respuestas empáticas
// ✅ Sugerencia de tono apropiado
// ✅ Detección de burnout y estado mental
//
// Autor: Antropic Claude Sonnet 4.5
// Fecha: 2025-01-XX

class EmotionalIntelligence {
  constructor(conversationMemory) {
    this.conversationMemory = conversationMemory;

    // Emociones detectables
    this.emotions = {
      FRUSTRATED: 'frustrated',
      STRESSED: 'stressed',
      HAPPY: 'happy',
      NEUTRAL: 'neutral',
      ANGRY: 'angry',
      CONFUSED: 'confused',
      EXCITED: 'excited',
      TIRED: 'tired',
      ANXIOUS: 'anxious',
      SATISFIED: 'satisfied',
    };

    // Palabras clave por emoción
    this.emotionKeywords = {
      frustrated: [
        'frustrado', 'frustrante', 'molesto', 'cansado de',
        'no funciona', 'nada funciona', 'siempre lo mismo',
        'harto', 'irritante', 'desesperante', 'no puedo más',
      ],
      stressed: [
        'urgente', 'rápido', 'ya', 'ahora', 'deadline',
        'presión', 'estresado', 'ansiedad', 'nervioso',
        'no tengo tiempo', 'apurado', 'demasiado trabajo',
      ],
      happy: [
        'genial', 'excelente', 'perfecto', 'increíble',
        'bien', 'funciona', 'gracias', 'contento',
        'feliz', 'satisfecho', 'éxito', 'logrado',
      ],
      angry: [
        'enojado', 'enfadado', 'furioso', 'indignado',
        'maldito', 'mierda', 'carajo', 'wtf',
        'odio', 'rabia', 'bronca',
      ],
      confused: [
        'no entiendo', 'confundido', 'confuso', 'qué',
        'cómo', 'no sé', 'perdido', 'desorientado',
        'no comprendo', 'unclear',
      ],
      excited: [
        'emocionado', 'ansioso por', 'no puedo esperar',
        'wow', 'increíble', 'asombroso', 'espectacular',
        'entusiasmado', 'motivado',
      ],
      tired: [
        'cansado', 'agotado', 'exhausto', 'fatigado',
        'sin energía', 'sin fuerzas', 'tarde',
        'sueño', 'dormido',
      ],
      anxious: [
        'preocupado', 'inquieto', 'ansioso', 'miedo',
        'temor', 'inseguro', 'dudoso', 'nervioso',
      ],
      satisfied: [
        'satisfecho', 'cumplido', 'completado', 'terminado',
        'listo', 'hecho', 'finalizado', 'resuelto',
      ],
    };

    // Patrones regex por emoción
    this.emotionPatterns = {
      frustrated: [
        /por qu[eé] no funciona/i,
        /esto no tiene sentido/i,
        /ya prob[eé] todo/i,
        /siempre (falla|el mismo error)/i,
      ],
      stressed: [
        /necesito .+ urgente/i,
        /r[aá]pido/i,
        /lo antes posible/i,
        /tengo que .+ ya/i,
      ],
      angry: [
        /!!+/,
        /\b[A-Z]{4,}\b/, // PALABRAS EN MAYÚSCULAS
        /qu[eé] caraj[oa]/i,
      ],
      confused: [
        /no entiendo/i,
        /qu[eé] significa/i,
        /c[oó]mo funciona/i,
        /qu[eé] es esto/i,
      ],
      tired: [
        /estoy (muy )?(cansado|agotado)/i,
        /no puedo m[aá]s/i,
        /necesito descansar/i,
      ],
    };

    // Estadísticas
    this.stats = {
      totalAnalyzed: 0,
      emotionCounts: {},
      dominantEmotion: 'neutral',
    };
  }

  async initialize() {
    console.log('[EmotionalIntelligence] Inicializando inteligencia emocional...');

    // Inicializar contadores
    for (const emotion of Object.values(this.emotions)) {
      this.stats.emotionCounts[emotion] = 0;
    }

    console.log('[EmotionalIntelligence] Listo ✓');
    return true;
  }

  // ============================================
  // DETECCIÓN DE EMOCIONES
  // ============================================

  /**
   * Detecta emoción en un mensaje individual
   */
  detectEmotion(message) {
    const scores = {};

    // Calcular score por cada emoción
    for (const [emotion, keywords] of Object.entries(this.emotionKeywords)) {
      scores[emotion] = this.calculateEmotionScore(message, keywords, emotion);
    }

    // Encontrar emoción dominante
    let dominantEmotion = 'neutral';
    let maxScore = 0;

    for (const [emotion, score] of Object.entries(scores)) {
      if (score > maxScore) {
        maxScore = score;
        dominantEmotion = emotion;
      }
    }

    // Si score muy bajo, es neutral
    if (maxScore < 0.3) {
      dominantEmotion = 'neutral';
      maxScore = 0.5;
    }

    // Actualizar estadísticas
    this.stats.totalAnalyzed++;
    this.stats.emotionCounts[dominantEmotion]++;

    return {
      emotion: dominantEmotion,
      intensity: maxScore,
      scores,
      confidence: maxScore > 0.5 ? 'high' : maxScore > 0.3 ? 'medium' : 'low',
    };
  }

  /**
   * Calcula score de una emoción específica
   */
  calculateEmotionScore(message, keywords, emotion) {
    const lowerMessage = message.toLowerCase();
    let score = 0;

    // 1. Keyword matching
    for (const keyword of keywords) {
      if (lowerMessage.includes(keyword)) {
        score += 0.2;
      }
    }

    // 2. Pattern matching
    const patterns = this.emotionPatterns[emotion] || [];
    for (const pattern of patterns) {
      if (pattern.test(message)) {
        score += 0.3;
      }
    }

    // 3. Intensificadores
    const intensifiers = ['muy', 'super', 'demasiado', 'extremadamente'];
    for (const intensifier of intensifiers) {
      if (lowerMessage.includes(intensifier)) {
        score *= 1.2; // Boost 20%
      }
    }

    // 4. Signos de puntuación múltiples
    if (/[!?]{2,}/.test(message)) {
      score *= 1.15; // Boost 15%
    }

    // Cap at 1.0
    return Math.min(score, 1.0);
  }

  /**
   * Detecta emoción basándose en historial reciente
   */
  detectEmotionFromHistory(turns = 10) {
    const history = this.conversationMemory.getHistory(turns);

    if (history.length === 0) {
      return {
        emotion: 'neutral',
        intensity: 0.5,
        trend: 'stable',
        confidence: 'low',
      };
    }

    const emotions = history.map(turn => {
      return this.detectEmotion(turn.userMessage);
    });

    // Calcular emoción promedio
    const avgScores = {};

    for (const emotionData of emotions) {
      for (const [emotion, score] of Object.entries(emotionData.scores)) {
        avgScores[emotion] = (avgScores[emotion] || 0) + score;
      }
    }

    // Normalizar
    for (const emotion in avgScores) {
      avgScores[emotion] /= emotions.length;
    }

    // Encontrar dominante
    let dominant = 'neutral';
    let maxScore = 0;

    for (const [emotion, score] of Object.entries(avgScores)) {
      if (score > maxScore) {
        maxScore = score;
        dominant = emotion;
      }
    }

    // Detectar tendencia
    const trend = this.detectEmotionTrend(emotions);

    return {
      emotion: dominant,
      intensity: maxScore,
      trend,
      confidence: maxScore > 0.5 ? 'high' : maxScore > 0.3 ? 'medium' : 'low',
      recentEmotions: emotions.slice(-5).map(e => e.emotion),
    };
  }

  /**
   * Detecta tendencia emocional (mejorando, empeorando, estable)
   */
  detectEmotionTrend(emotions) {
    if (emotions.length < 3) return 'stable';

    const recent = emotions.slice(-3);
    const intensities = recent.map(e => e.intensity);

    // Comparar última vs primeras
    const last = intensities[intensities.length - 1];
    const first = intensities[0];

    const diff = last - first;

    // Tendencia basada en emociones negativas
    const negativeEmotions = ['frustrated', 'stressed', 'angry', 'tired', 'anxious'];
    const recentNegative = recent.filter(e => negativeEmotions.includes(e.emotion)).length;

    if (recentNegative >= 2) {
      return 'worsening'; // Empeorando
    }

    if (diff > 0.2) return 'intensifying'; // Intensificando
    if (diff < -0.2) return 'improving'; // Mejorando
    return 'stable'; // Estable
  }

  // ============================================
  // RESPUESTAS EMPÁTICAS
  // ============================================

  /**
   * Genera respuesta empática según emoción
   */
  generateEmpatheticResponse(emotion, intensity) {
    const responses = {
      frustrated: {
        high: [
          'Entiendo su frustración, señor. Permítame ayudarle con esto de inmediato.',
          'Veo que esto está resultando frustrante. Déjeme investigar qué sucede.',
          'Comprendo. Voy a resolver esto ahora mismo.',
          'Puedo notar su frustración. Trabajaré en esto con prioridad.',
        ],
        medium: [
          'Entiendo. Permítame asistirle.',
          'Veo el problema. Trabajaré en esto.',
          'Comprendo la situación. Investigaré.',
        ],
        low: [
          'Entendido, señor.',
          'Por supuesto.',
          'Claro.',
        ],
      },
      stressed: {
        high: [
          'Entiendo la urgencia. Procederé inmediatamente.',
          'Comprendo. Ejecutaré esto con prioridad máxima.',
          'Entendido. En proceso ahora.',
          'Detecté la urgencia. Procesando inmediatamente.',
        ],
        medium: [
          'Entendido. Procedo con rapidez.',
          'Lo atenderé prioritariamente.',
          'Procesando con urgencia.',
        ],
        low: [
          'Entendido.',
          'Por supuesto.',
        ],
      },
      happy: {
        high: [
          'Excelente, señor. Me complace que esté satisfecho.',
          'Me alegra que funcione correctamente.',
          'Satisfactorio, señor.',
          'Notable resultado.',
        ],
        medium: [
          'Bien, señor.',
          'Excelente.',
          'Satisfactorio.',
        ],
        low: [
          'Entendido.',
          'Bien.',
        ],
      },
      confused: {
        high: [
          'Permítame explicarlo de manera más clara.',
          'Disculpe si no fui claro. Reformularé.',
          'Comprendo la confusión. Expliquemos esto paso a paso.',
          'Entiendo. Clarificaré inmediatamente.',
        ],
        medium: [
          'Permítame clarificar.',
          'Explicaré con más detalle.',
          'Déjeme aclarar eso.',
        ],
        low: [
          'Claro.',
          'Por supuesto.',
        ],
      },
      angry: {
        high: [
          'Comprendo su molestia, señor. Atenderé esto inmediatamente.',
          'Entiendo. Resolveré esta situación ahora.',
          'Lo siento, señor. Investigaré qué falló.',
        ],
        medium: [
          'Entiendo su molestia. Trabajaré en esto.',
          'Comprendo. Investigaré el problema.',
        ],
        low: [
          'Entendido.',
        ],
      },
      tired: {
        high: [
          'Entiendo que está cansado, señor. Seré breve.',
          'Noto el cansancio. Procederé eficientemente.',
          'Comprendo. Haré esto rápido.',
        ],
        medium: [
          'Entendido. Seré conciso.',
          'Procederé brevemente.',
        ],
        low: [
          'Entendido.',
        ],
      },
      anxious: {
        high: [
          'Comprendo su preocupación. Validaré todo cuidadosamente.',
          'Entiendo la inquietud. Verificaré cada detalle.',
          'No se preocupe, señor. Lo manejaré con cuidado.',
        ],
        medium: [
          'Entiendo. Procederé con precaución.',
          'Comprendo. Verificaré todo.',
        ],
        low: [
          'Entendido.',
        ],
      },
    };

    const emotionResponses = responses[emotion];
    if (!emotionResponses) return null;

    let level = 'low';
    if (intensity > 0.7) level = 'high';
    else if (intensity > 0.4) level = 'medium';

    const options = emotionResponses[level];

    return options[Math.floor(Math.random() * options.length)];
  }

  // ============================================
  // SUGERENCIA DE TONO
  // ============================================

  /**
   * Sugiere tono de respuesta apropiado
   */
  suggestTone(emotionData) {
    const { emotion, intensity } = emotionData;

    const toneMap = {
      frustrated: {
        type: 'empathetic',
        sarcasm: 0,
        humor: 0,
        formality: 5,
        empathy: 9,
        brevity: 7,
        urgency: 'high',
      },
      stressed: {
        type: 'urgent',
        sarcasm: 0,
        humor: 0,
        formality: 8,
        empathy: 6,
        brevity: 10,
        urgency: 'critical',
      },
      happy: {
        type: 'professional',
        sarcasm: 3,
        humor: 6,
        formality: 4,
        empathy: 5,
        brevity: 5,
        urgency: 'normal',
      },
      neutral: {
        type: 'professional',
        sarcasm: 4,
        humor: 5,
        formality: 4,
        empathy: 5,
        brevity: 5,
        urgency: 'normal',
      },
      angry: {
        type: 'calm',
        sarcasm: 0,
        humor: 0,
        formality: 7,
        empathy: 8,
        brevity: 8,
        urgency: 'high',
      },
      confused: {
        type: 'explanatory',
        sarcasm: 0,
        humor: 2,
        formality: 5,
        empathy: 7,
        brevity: 3, // Respuestas detalladas
        urgency: 'normal',
      },
      excited: {
        type: 'enthusiastic',
        sarcasm: 1,
        humor: 7,
        formality: 3,
        empathy: 6,
        brevity: 5,
        urgency: 'normal',
      },
      tired: {
        type: 'gentle',
        sarcasm: 0,
        humor: 3,
        formality: 4,
        empathy: 8,
        brevity: 8, // Respuestas breves
        urgency: 'low',
      },
      anxious: {
        type: 'reassuring',
        sarcasm: 0,
        humor: 1,
        formality: 6,
        empathy: 9,
        brevity: 6,
        urgency: 'normal',
      },
      satisfied: {
        type: 'positive',
        sarcasm: 2,
        humor: 6,
        formality: 4,
        empathy: 5,
        brevity: 5,
        urgency: 'low',
      },
    };

    return toneMap[emotion] || toneMap.neutral;
  }

  // ============================================
  // ESTADÍSTICAS
  // ============================================

  getStats() {
    // Calcular emoción dominante global
    let maxCount = 0;
    let dominantEmotion = 'neutral';

    for (const [emotion, count] of Object.entries(this.stats.emotionCounts)) {
      if (count > maxCount) {
        maxCount = count;
        dominantEmotion = emotion;
      }
    }

    this.stats.dominantEmotion = dominantEmotion;

    // Calcular distribución porcentual
    const distribution = {};
    for (const [emotion, count] of Object.entries(this.stats.emotionCounts)) {
      distribution[emotion] = this.stats.totalAnalyzed > 0
        ? ((count / this.stats.totalAnalyzed) * 100).toFixed(1)
        : 0;
    }

    return {
      totalAnalyzed: this.stats.totalAnalyzed,
      emotionDistribution: distribution,
      dominantEmotion: this.stats.dominantEmotion,
      currentEmotion: this.detectEmotionFromHistory(5),
    };
  }
}

export default EmotionalIntelligence;

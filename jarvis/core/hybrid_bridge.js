// ============================================
// HYBRID BRIDGE - Puente JavaScript ↔ Python
// ============================================
// Módulo que conecta el motor JavaScript con
// el backend Python de IA local
//
// Flujo:
// 1. JavaScript detecta necesidad de IA profunda
// 2. HybridBridge llama a Flask API (Python)
// 3. Python procesa con Ollama (Mistral/Llama2)
// 4. Retorna respuesta a JavaScript
// 5. Si Python falla, fallback a respuestas JS
//
// Autor: J.A.R.V.I.S. para Ulmer Solier
// Fecha: 2025-01-05

import fetch from 'node-fetch';

class HybridBridge {
  constructor(pythonServerUrl = 'http://127.0.0.1:5000') {
    this.pythonServerUrl = pythonServerUrl;
    this.available = false;
    this.lastHealthCheck = null;
    this.healthCheckInterval = 30000; // 30 segundos

    // Estadísticas
    this.stats = {
      totalCalls: 0,
      successfulCalls: 0,
      failedCalls: 0,
      fallbackCalls: 0,
      avgResponseTime: 0,
    };
  }

  /**
   * Helper para fetch con timeout
   */
  async fetchWithTimeout(url, options = {}, timeoutMs = 5000) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      return response;
    } catch (error) {
      clearTimeout(timeoutId);
      throw error;
    }
  }

  /**
   * Inicializa el puente y verifica conexión con Python
   */
  async initialize() {
    console.log('[HybridBridge] Inicializando puente JS ↔ Python...');

    // Verificar si servidor Python está disponible
    this.available = await this.checkHealth();

    if (this.available) {
      console.log('✅ [HybridBridge] Conectado al motor de IA Python');

      // Iniciar monitoreo periódico
      this.startHealthMonitoring();
    } else {
      console.warn('⚠️  [HybridBridge] Motor de IA Python no disponible');
      console.warn('   Continuando con capacidades básicas de JavaScript');
      console.warn('   Para habilitar IA profunda:');
      console.warn('   1. cd python');
      console.warn('   2. pip install -r requirements.txt');
      console.warn('   3. ollama serve (en otra terminal)');
      console.warn('   4. ollama pull mistral');
      console.warn('   5. python server.py');
    }

    return this.available;
  }

  /**
   * Verifica salud del servidor Python
   */
  async checkHealth() {
    try {
      const response = await this.fetchWithTimeout(
        `${this.pythonServerUrl}/health`,
        { method: 'GET' },
        5000 // 5 segundos para health check
      );

      if (!response.ok) {
        console.error('[HybridBridge] Health check failed: HTTP', response.status);
        return false;
      }

      const data = await response.json();
      this.lastHealthCheck = Date.now();

      const isHealthy = data.status === 'operational' && data.ollama_available;

      if (!isHealthy) {
        console.error('[HybridBridge] Health check failed:', {
          status: data.status,
          ollama_available: data.ollama_available
        });
      }

      return isHealthy;
    } catch (error) {
      console.error('[HybridBridge] Health check error:', error.message);
      return false;
    }
  }

  /**
   * Inicia monitoreo periódico de salud
   */
  startHealthMonitoring() {
    setInterval(async () => {
      const wasAvailable = this.available;
      this.available = await this.checkHealth();

      // Notificar cambio de estado
      if (wasAvailable && !this.available) {
        console.warn('⚠️  [HybridBridge] Motor de IA Python desconectado');
      } else if (!wasAvailable && this.available) {
        console.log('✅ [HybridBridge] Motor de IA Python reconectado');
      }
    }, this.healthCheckInterval);
  }

  /**
   * Procesa mensaje con IA profunda (Python + Ollama)
   *
   * @param {string} userMessage - Mensaje del usuario
   * @param {object} context - Contexto adicional
   * @param {boolean} useHistory - Usar historial conversacional
   * @returns {object} Resultado del procesamiento
   */
  async processWithDeepAI(userMessage, context = {}, useHistory = true) {
    this.stats.totalCalls++;
    const startTime = Date.now();

    // Si Python no está disponible, retornar fallback inmediatamente
    if (!this.available) {
      this.stats.fallbackCalls++;
      return {
        success: false,
        fallback: true,
        response: null,
        error: 'Motor de IA Python no disponible',
      };
    }

    try {
      const response = await fetch(`${this.pythonServerUrl}/ai/process`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: userMessage,
          context: context,
          use_history: useHistory,
        }),
        timeout: 30000, // 30 segundos max
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();

      // Actualizar estadísticas
      const responseTime = Date.now() - startTime;

      if (data.success) {
        this.stats.successfulCalls++;

        // Calcular tiempo promedio
        const totalSuccess = this.stats.successfulCalls;
        const currentAvg = this.stats.avgResponseTime;
        this.stats.avgResponseTime =
          (currentAvg * (totalSuccess - 1) + responseTime) / totalSuccess;

        return {
          success: true,
          response: data.response,
          model: data.model,
          responseTime: data.response_time,
          tokens: data.tokens,
          fallback: false,
        };
      } else {
        this.stats.failedCalls++;
        return {
          success: false,
          fallback: true,
          response: data.response || null,
          error: data.error,
        };
      }
    } catch (error) {
      this.stats.failedCalls++;
      console.error('[HybridBridge] Error llamando a Python:', error.message);

      return {
        success: false,
        fallback: true,
        response: null,
        error: error.message,
      };
    }
  }

  /**
   * Registra feedback para aprendizaje
   *
   * @param {string} userMessage - Mensaje original
   * @param {string} aiResponse - Respuesta dada
   * @param {string} feedback - Comentario del usuario
   * @param {number} rating - Calificación 1-5
   */
  async learnFromFeedback(userMessage, aiResponse, feedback, rating) {
    if (!this.available) {
      console.warn('[HybridBridge] No se puede enviar feedback: Python no disponible');
      return false;
    }

    try {
      const response = await fetch(`${this.pythonServerUrl}/ai/learn`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user_message: userMessage,
          ai_response: aiResponse,
          feedback: feedback,
          rating: rating,
        }),
        timeout: 5000,
      });

      const data = await response.json();
      return data.success;
    } catch (error) {
      console.error('[HybridBridge] Error enviando feedback:', error.message);
      return false;
    }
  }

  /**
   * Obtiene conversaciones relevantes de memoria
   *
   * @param {string} query - Consulta
   * @param {number} limit - Límite de resultados
   */
  async getRelevantMemory(query, limit = 3) {
    if (!this.available) {
      return [];
    }

    try {
      const url = new URL(`${this.pythonServerUrl}/ai/memory`);
      url.searchParams.append('query', query);
      url.searchParams.append('limit', limit.toString());

      const response = await fetch(url.toString(), {
        method: 'GET',
        timeout: 5000,
      });

      const data = await response.json();

      if (data.success) {
        return data.results;
      }

      return [];
    } catch (error) {
      console.error('[HybridBridge] Error obteniendo memoria:', error.message);
      return [];
    }
  }

  /**
   * Obtiene estadísticas del motor de IA Python
   */
  async getPythonStats() {
    if (!this.available) {
      return null;
    }

    try {
      const response = await fetch(`${this.pythonServerUrl}/ai/stats`, {
        method: 'GET',
        timeout: 3000,
      });

      const data = await response.json();

      if (data.success) {
        return data.stats;
      }

      return null;
    } catch (error) {
      console.error('[HybridBridge] Error obteniendo stats:', error.message);
      return null;
    }
  }

  /**
   * Limpia historial de conversación en Python
   */
  async clearHistory() {
    if (!this.available) {
      return false;
    }

    try {
      const response = await fetch(`${this.pythonServerUrl}/ai/clear-history`, {
        method: 'POST',
        timeout: 3000,
      });

      const data = await response.json();
      return data.success;
    } catch (error) {
      console.error('[HybridBridge] Error limpiando historial:', error.message);
      return false;
    }
  }

  /**
   * Determina si un mensaje necesita IA profunda
   *
   * Criterios:
   * - Preguntas complejas o filosóficas
   * - Análisis de código extenso
   * - Razonamiento multi-paso
   * - Creatividad o generación de texto
   * - Explicaciones detalladas
   *
   * @param {string} message - Mensaje a analizar
   * @param {object} analysis - Análisis NLP previo
   * @returns {boolean} True si necesita IA profunda
   */
  needsDeepAI(message, analysis = {}) {
    const messageLower = message.toLowerCase();

    // CASO 1: Preguntas filosóficas o complejas
    const complexQuestions = [
      'por qué',
      'porque',
      'cómo funciona',
      'explícame',
      'cuéntame sobre',
      'qué opinas',
      'qué piensas',
      'analiza',
      'compara',
      'diferencia entre',
    ];

    if (complexQuestions.some((q) => messageLower.includes(q))) {
      return true;
    }

    // CASO 2: Solicitudes de generación creativa
    const creativeRequests = [
      'escribe',
      'genera',
      'crea un',
      'inventa',
      'diseña',
      'sugiere',
      'recomienda',
    ];

    if (creativeRequests.some((r) => messageLower.includes(r))) {
      return true;
    }

    // CASO 3: Análisis de código o arquitectura
    const codeAnalysis = [
      'refactoriza',
      'optimiza',
      'mejora este código',
      'review',
      'arquitectura',
      'patrón de diseño',
    ];

    if (codeAnalysis.some((c) => messageLower.includes(c))) {
      return true;
    }

    // CASO 4: Mensaje largo (>100 caracteres) - probablemente complejo
    if (message.length > 100) {
      return true;
    }

    // CASO 5: Intent de conversación natural (no comando)
    if (analysis.intent && analysis.intent.action === 'chat') {
      return true;
    }

    // Por defecto, tareas simples se manejan en JavaScript
    return false;
  }

  /**
   * Obtiene estadísticas del puente
   */
  getStats() {
    return {
      available: this.available,
      lastHealthCheck: this.lastHealthCheck,
      ...this.stats,
    };
  }

  /**
   * Shutdown del puente
   */
  shutdown() {
    console.log('[HybridBridge] Deteniendo puente JS ↔ Python...');
    // Limpiar intervalos si existen
  }
}

export default HybridBridge;

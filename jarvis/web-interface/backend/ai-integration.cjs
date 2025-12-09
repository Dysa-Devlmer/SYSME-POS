/**
 * ⚡ J.A.R.V.I.S. AI INTEGRATION - Backend Module
 *
 * "I'm constantly evolving, sir. Each decision makes me smarter."
 * - JARVIS
 *
 * Integra todos los sistemas de IA con el backend Express + WebSocket
 *
 * @version 4.0.0 Mark VII
 * @author Stark Industries - Backend AI Division
 */

const path = require('path');

// Importar sistema maestro de IA
const { JARVISAIMasterSystem } = require('../../jarvis-ai-integration.cjs');

class AIIntegration {
  constructor(io, logger) {
    this.io = io;
    this.logger = logger || console;
    this.aiSystem = null;
    this.initialized = false;
  }

  async initialize() {
    try {
      this.logger.info('\n⚡ Initializing AI Integration...');

      // Inicializar sistema maestro de IA
      this.aiSystem = new JARVISAIMasterSystem({
        userId: 'web-user',
        enableSelfImprovement: true,
        enableRL: true,
        enablePatternAnalysis: true,
        enablePredictive: true,
        saveInterval: 5 * 60 * 1000 // 5 minutos
      });

      await this.aiSystem.initialize();

      // Setup event listeners para WebSocket
      this.setupAIEventListeners();

      // Setup periodic updates
      this.setupPeriodicUpdates();

      this.initialized = true;

      this.logger.info('✓ AI Integration ready\n');

    } catch (error) {
      this.logger.error('✗ AI Integration failed:', error.message);
      throw error;
    }
  }

  setupAIEventListeners() {
    // Emitir eventos de IA a través de WebSocket

    this.aiSystem.on('interactionProcessed', (data) => {
      this.io.emit('ai:interaction', {
        type: 'interaction_processed',
        data
      });
    });

    this.aiSystem.on('aiLearned', (data) => {
      this.io.emit('ai:learning', {
        type: 'learning_update',
        data
      });
    });

    this.aiSystem.on('patternsDetected', (data) => {
      this.io.emit('ai:patterns', {
        type: 'patterns_detected',
        data
      });
    });

    this.aiSystem.on('anomalyDetected', (data) => {
      this.io.emit('ai:anomaly', {
        type: 'anomaly_detected',
        data,
        severity: 'warning'
      });
    });

    this.aiSystem.on('resourcesPrepared', (data) => {
      this.io.emit('ai:resources', {
        type: 'resources_prepared',
        data
      });
    });

    this.aiSystem.on('resourceUsed', (data) => {
      this.io.emit('ai:resources', {
        type: 'resource_used',
        data
      });
    });
  }

  setupPeriodicUpdates() {
    // Enviar estadísticas cada 30 segundos
    setInterval(() => {
      if (this.initialized) {
        const stats = this.aiSystem.getSystemStatus();

        this.io.emit('ai:stats', {
          type: 'statistics_update',
          data: stats
        });
      }
    }, 30000);
  }

  // ==========================================================================
  // REST API METHODS
  // ==========================================================================

  /**
   * POST /api/ai/interact
   * Procesa una interacción con todos los sistemas de IA
   */
  async handleInteraction(req, res) {
    if (!this.initialized) {
      return res.status(503).json({
        success: false,
        error: 'AI System not initialized'
      });
    }

    try {
      const { input, context } = req.body;

      if (!input) {
        return res.status(400).json({
          success: false,
          error: 'Input is required'
        });
      }

      const result = await this.aiSystem.processInteraction({
        input,
        context: context || {},
        userId: req.user?.id || 'web-user'
      });

      res.json({
        success: true,
        ...result
      });

    } catch (error) {
      this.logger.error('Error in AI interaction:', error.message);

      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * GET /api/ai/insights
   * Obtiene insights de aprendizaje de IA
   */
  async getInsights(req, res) {
    if (!this.initialized) {
      return res.status(503).json({
        success: false,
        error: 'AI System not initialized'
      });
    }

    try {
      const insights = this.aiSystem.getAIInsights();

      res.json({
        success: true,
        insights
      });

    } catch (error) {
      this.logger.error('Error getting AI insights:', error.message);

      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * GET /api/ai/status
   * Obtiene estado del sistema de IA
   */
  async getStatus(req, res) {
    if (!this.initialized) {
      return res.status(503).json({
        success: false,
        error: 'AI System not initialized'
      });
    }

    try {
      const status = this.aiSystem.getSystemStatus();

      res.json({
        success: true,
        status
      });

    } catch (error) {
      this.logger.error('Error getting AI status:', error.message);

      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * GET /api/ai/patterns
   * Obtiene patrones detectados del usuario
   */
  async getPatterns(req, res) {
    if (!this.initialized || !this.aiSystem.patternAnalyzer) {
      return res.status(503).json({
        success: false,
        error: 'Pattern Analyzer not available'
      });
    }

    try {
      const stats = this.aiSystem.patternAnalyzer.getStatistics();

      res.json({
        success: true,
        patterns: stats.patterns
      });

    } catch (error) {
      this.logger.error('Error getting patterns:', error.message);

      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * GET /api/ai/predictions
   * Obtiene predicciones actuales
   */
  async getPredictions(req, res) {
    if (!this.initialized || !this.aiSystem.predictiveAI) {
      return res.status(503).json({
        success: false,
        error: 'Predictive AI not available'
      });
    }

    try {
      const context = this.aiSystem.buildPredictionContext(req.query || {});
      const predictions = await this.aiSystem.predictiveAI.predict(context);

      res.json({
        success: true,
        predictions: predictions.predictions
      });

    } catch (error) {
      this.logger.error('Error getting predictions:', error.message);

      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * GET /api/ai/recommendations
   * Obtiene recomendaciones personalizadas
   */
  async getRecommendations(req, res) {
    if (!this.initialized || !this.aiSystem.patternAnalyzer) {
      return res.status(503).json({
        success: false,
        error: 'Pattern Analyzer not available'
      });
    }

    try {
      const recommendations = this.aiSystem.patternAnalyzer.getPersonalizedRecommendations();

      res.json({
        success: true,
        recommendations
      });

    } catch (error) {
      this.logger.error('Error getting recommendations:', error.message);

      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * POST /api/ai/feedback
   * Registra feedback del usuario sobre una interacción
   */
  async registerFeedback(req, res) {
    if (!this.initialized) {
      return res.status(503).json({
        success: false,
        error: 'AI System not initialized'
      });
    }

    try {
      const { interactionId, feedback } = req.body;

      // Aquí se podría actualizar el sistema con el feedback
      // Por ahora, solo lo registramos

      this.logger.info('User feedback received:', { interactionId, feedback });

      res.json({
        success: true,
        message: 'Feedback registered'
      });

    } catch (error) {
      this.logger.error('Error registering feedback:', error.message);

      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * GET /api/ai/statistics
   * Obtiene estadísticas detalladas de todos los sistemas
   */
  async getDetailedStatistics(req, res) {
    if (!this.initialized) {
      return res.status(503).json({
        success: false,
        error: 'AI System not initialized'
      });
    }

    try {
      const stats = {
        global: this.aiSystem.globalStats,
        systemStatus: this.aiSystem.getSystemStatus(),
        insights: this.aiSystem.getAIInsights()
      };

      // Estadísticas de cada subsistema
      if (this.aiSystem.selfImprovement) {
        stats.selfImprovement = this.aiSystem.selfImprovement.learningEngine.getStatistics();
      }

      if (this.aiSystem.reinforcementLearning) {
        stats.reinforcementLearning = this.aiSystem.reinforcementLearning.getStatistics();
      }

      if (this.aiSystem.patternAnalyzer) {
        stats.patternAnalyzer = this.aiSystem.patternAnalyzer.getStatistics();
      }

      if (this.aiSystem.predictiveAI) {
        stats.predictiveAI = this.aiSystem.predictiveAI.getStatistics();
      }

      res.json({
        success: true,
        statistics: stats
      });

    } catch (error) {
      this.logger.error('Error getting detailed statistics:', error.message);

      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * POST /api/ai/save
   * Guarda el estado de todos los sistemas de IA
   */
  async saveAIState(req, res) {
    if (!this.initialized) {
      return res.status(503).json({
        success: false,
        error: 'AI System not initialized'
      });
    }

    try {
      await this.aiSystem.saveAllSystems();

      res.json({
        success: true,
        message: 'AI state saved successfully'
      });

    } catch (error) {
      this.logger.error('Error saving AI state:', error.message);

      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  // ==========================================================================
  // WEBSOCKET HANDLERS
  // ==========================================================================

  setupSocketHandlers(socket) {
    // Cliente solicita interacción con IA
    socket.on('ai:interact', async (data) => {
      try {
        const result = await this.aiSystem.processInteraction(data);

        socket.emit('ai:interaction:result', {
          success: true,
          ...result
        });

      } catch (error) {
        socket.emit('ai:interaction:error', {
          success: false,
          error: error.message
        });
      }
    });

    // Cliente solicita estadísticas
    socket.on('ai:request:stats', async () => {
      try {
        const stats = this.aiSystem.getSystemStatus();

        socket.emit('ai:stats', {
          type: 'statistics_response',
          data: stats
        });

      } catch (error) {
        socket.emit('ai:error', {
          error: error.message
        });
      }
    });

    // Cliente solicita insights
    socket.on('ai:request:insights', async () => {
      try {
        const insights = this.aiSystem.getAIInsights();

        socket.emit('ai:insights', {
          type: 'insights_response',
          data: insights
        });

      } catch (error) {
        socket.emit('ai:error', {
          error: error.message
        });
      }
    });

    // Cliente solicita predicciones
    socket.on('ai:request:predictions', async (context) => {
      try {
        const predictionContext = this.aiSystem.buildPredictionContext(context || {});
        const predictions = await this.aiSystem.predictiveAI.predict(predictionContext);

        socket.emit('ai:predictions', {
          type: 'predictions_response',
          data: predictions
        });

      } catch (error) {
        socket.emit('ai:error', {
          error: error.message
        });
      }
    });
  }

  /**
   * Registra una interacción del chat en los sistemas de IA
   * Conecta Intelligent Chat System con AI Master System
   */
  async recordInteraction(userId, userMessage, aiResponse) {
    if (!this.initialized) {
      this.logger.warn('AI System not initialized, skipping interaction recording');
      return;
    }

    try {
      // Procesar interacción con todos los sistemas de IA
      const result = await this.aiSystem.processInteraction({
        input: userMessage,
        context: {
          type: 'chat',
          response: aiResponse,
          timestamp: Date.now()
        },
        userId: userId
      });

      this.logger.info(`✅ Chat interaction recorded for ${userId}`);

      // Emitir evento de aprendizaje
      this.io.emit('ai:learning', {
        type: 'chat_learned',
        data: {
          userId,
          message: userMessage,
          learned: true,
          timestamp: Date.now()
        }
      });

      return result;

    } catch (error) {
      this.logger.error('Error recording interaction:', error.message);
      // No lanzamos error para no interrumpir el flujo del chat
    }
  }

  // ==========================================================================
  // SHUTDOWN
  // ==========================================================================

  async shutdown() {
    if (this.aiSystem) {
      await this.aiSystem.shutdown();
    }
  }

  // ==========================================================================
  // EXPRESS ROUTER
  // ==========================================================================

  getRouter() {
    const router = require('express').Router();

    // REST API Routes
    router.post('/interact', this.handleInteraction.bind(this));
    router.get('/insights', this.getInsights.bind(this));
    router.get('/status', this.getStatus.bind(this));
    router.get('/patterns', this.getPatterns.bind(this));
    router.get('/predictions', this.getPredictions.bind(this));
    router.get('/recommendations', this.getRecommendations.bind(this));
    router.post('/feedback', this.registerFeedback.bind(this));
    router.get('/statistics', this.getDetailedStatistics.bind(this));
    router.post('/save', this.saveAIState.bind(this));

    return router;
  }
}

module.exports = AIIntegration;

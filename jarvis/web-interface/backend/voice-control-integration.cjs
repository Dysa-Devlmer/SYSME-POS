// web-interface/backend/voice-control-integration.cjs
// Integración del Control por Voz con Socket.io

const VoiceCommandProcessor = require('../../core/voice/voice-command-processor.cjs');

/**
 * Integración de Voice Control con Socket.io
 */
class VoiceControlIntegration {
  constructor(io, options = {}) {
    this.io = io;
    this.options = options;
    this.processor = null;
    this.isInitialized = false;
  }

  /**
   * Inicializa el procesador de voz
   */
  async initialize() {
    if (this.isInitialized) return;

    console.log('🎤 [Voice Control Integration] Inicializando...');

    // Obtener referencias a otros sistemas
    const autonomousAgent = this.options.autonomousIntegration?.agent;
    const notificationSystem = autonomousAgent?.notificationSystem;
    const searchEngine = this.options.codeSearchIntegration?.searchEngine;
    const aiAnalyzer = autonomousAgent?.aiAnalyzer;

    this.processor = new VoiceCommandProcessor({
      aiAnalyzer,
      autonomousAgent,
      notificationSystem,
      searchEngine,
      docGenerator: null // TODO: agregar doc generator
    });

    this.isInitialized = true;
    console.log('✅ [Voice Control Integration] Listo');
  }

  /**
   * Setup de handlers de socket
   */
  setupSocketHandlers(socket) {
    // Procesar comando de voz
    socket.on('voice:command', async (data) => {
      try {
        if (!this.isInitialized) {
          await this.initialize();
        }

        const { text } = data;
        console.log(`🎤 [Voice] Comando recibido: "${text}"`);

        const result = await this.processor.processCommand(text);

        socket.emit('voice:response', result);

        // Si hay una acción, emitir evento específico
        if (result.action) {
          this.handleAction(socket, result.action, result.parameters);
        }

      } catch (error) {
        console.error('❌ [Voice] Error procesando comando:', error);
        socket.emit('voice:response', {
          success: false,
          response: 'Lo siento, hubo un error procesando tu comando',
          error: error.message
        });
      }
    });

    // Obtener historial
    socket.on('voice:get-history', () => {
      try {
        if (!this.processor) {
          socket.emit('voice:history', []);
          return;
        }

        const history = this.processor.getHistory();
        socket.emit('voice:history', history);

      } catch (error) {
        socket.emit('voice:error', {
          message: error.message
        });
      }
    });

    // Limpiar historial
    socket.on('voice:clear-history', () => {
      try {
        if (this.processor) {
          this.processor.clearHistory();
        }

        socket.emit('voice:history', []);

      } catch (error) {
        socket.emit('voice:error', {
          message: error.message
        });
      }
    });

    // Obtener estadísticas
    socket.on('voice:get-stats', () => {
      try {
        if (!this.processor) {
          socket.emit('voice:stats', {});
          return;
        }

        const stats = this.processor.getStats();
        socket.emit('voice:stats', stats);

      } catch (error) {
        socket.emit('voice:error', {
          message: error.message
        });
      }
    });
  }

  /**
   * Maneja acciones específicas del comando
   */
  handleAction(socket, action, parameters) {
    switch (action) {
      case 'execute-task':
        if (parameters && parameters.task) {
          socket.emit('action:execute-task', { task: parameters.task });
        }
        break;

      case 'pause':
        socket.emit('action:pause');
        break;

      case 'resume':
        socket.emit('action:resume');
        break;

      case 'search':
        if (parameters && parameters.query) {
          socket.emit('action:search', { query: parameters.query });
        }
        break;

      case 'document':
        if (parameters && parameters.target) {
          socket.emit('action:document', { target: parameters.target });
        }
        break;

      case 'show-notifications':
        socket.emit('action:show-notifications');
        break;

      case 'clear-notifications':
        socket.emit('action:clear-notifications');
        break;

      case 'learn':
        if (parameters && parameters.topic) {
          socket.emit('action:learn', { topic: parameters.topic });
        }
        break;

      case 'open-view':
        if (parameters && parameters.view) {
          socket.emit('action:open-view', { view: parameters.view });
        }
        break;

      default:
        console.log(`⚠️ [Voice] Acción desconocida: ${action}`);
    }
  }
}

module.exports = VoiceControlIntegration;

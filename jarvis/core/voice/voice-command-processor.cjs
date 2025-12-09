// core/voice/voice-command-processor.cjs
// Procesador de Comandos de Voz para JARVIS

const EventEmitter = require('events');

/**
 * Voice Command Processor
 *
 * Procesa comandos de voz y los convierte en acciones
 *
 * Características:
 * - Detección de intención
 * - Extracción de parámetros
 * - Comandos contextuales
 * - Historial de conversación
 * - Sugerencias inteligentes
 */
class VoiceCommandProcessor extends EventEmitter {
  constructor(options = {}) {
    super();

    this.aiAnalyzer = options.aiAnalyzer;
    this.autonomousAgent = options.autonomousAgent;
    this.notificationSystem = options.notificationSystem;
    this.searchEngine = options.searchEngine;
    this.docGenerator = options.docGenerator;

    // Historial de conversación
    this.conversationHistory = [];
    this.maxHistoryLength = options.maxHistoryLength || 50;

    // Comandos predefinidos
    this.commands = this.initializeCommands();
  }

  /**
   * Inicializa los comandos disponibles
   */
  initializeCommands() {
    return {
      // Comandos del sistema
      'status': {
        patterns: ['status', 'estado', 'cómo estás', 'how are you'],
        handler: this.handleStatus.bind(this),
        description: 'Muestra el estado del sistema'
      },
      'help': {
        patterns: ['ayuda', 'help', 'qué puedes hacer', 'comandos'],
        handler: this.handleHelp.bind(this),
        description: 'Muestra los comandos disponibles'
      },

      // Comandos de tareas autónomas
      'execute-task': {
        patterns: ['ejecuta', 'execute', 'haz', 'do', 'realiza', 'perform'],
        handler: this.handleExecuteTask.bind(this),
        description: 'Ejecuta una tarea autónoma'
      },
      'pause': {
        patterns: ['pausa', 'pause', 'detén', 'stop'],
        handler: this.handlePause.bind(this),
        description: 'Pausa la ejecución actual'
      },
      'resume': {
        patterns: ['continúa', 'resume', 'reanuda', 'continue'],
        handler: this.handleResume.bind(this),
        description: 'Reanuda la ejecución'
      },

      // Comandos de búsqueda
      'search': {
        patterns: ['busca', 'search', 'encuentra', 'find', 'localiza', 'locate'],
        handler: this.handleSearch.bind(this),
        description: 'Busca código en el proyecto'
      },

      // Comandos de documentación
      'document': {
        patterns: ['documenta', 'document', 'genera documentación', 'create docs'],
        handler: this.handleDocument.bind(this),
        description: 'Genera documentación'
      },

      // Comandos de notificaciones
      'notifications': {
        patterns: ['notificaciones', 'notifications', 'avisos', 'alerts'],
        handler: this.handleNotifications.bind(this),
        description: 'Muestra las notificaciones'
      },
      'clear-notifications': {
        patterns: ['limpia notificaciones', 'clear notifications', 'borra notificaciones'],
        handler: this.handleClearNotifications.bind(this),
        description: 'Limpia las notificaciones'
      },

      // Comandos de aprendizaje
      'learn': {
        patterns: ['aprende', 'learn', 'investiga', 'research'],
        handler: this.handleLearn.bind(this),
        description: 'Aprende sobre un tema'
      },

      // Comandos generales
      'open': {
        patterns: ['abre', 'open', 'muestra', 'show'],
        handler: this.handleOpen.bind(this),
        description: 'Abre una vista o panel'
      }
    };
  }

  /**
   * Procesa un comando de voz
   */
  async processCommand(text, context = {}) {
    console.log(`🎤 [Voice] Procesando: "${text}"`);

    // Agregar al historial
    this.addToHistory({
      type: 'user',
      text,
      timestamp: Date.now()
    });

    // Normalizar texto
    const normalizedText = text.toLowerCase().trim();

    // Buscar comando coincidente
    const matchedCommand = this.findMatchingCommand(normalizedText);

    if (matchedCommand) {
      try {
        const result = await matchedCommand.handler(normalizedText, context);

        // Agregar respuesta al historial
        this.addToHistory({
          type: 'assistant',
          text: result.response,
          timestamp: Date.now(),
          data: result.data
        });

        this.emit('command:executed', {
          command: matchedCommand.name,
          input: text,
          result
        });

        return result;

      } catch (error) {
        console.error('❌ [Voice] Error ejecutando comando:', error);

        const errorResponse = {
          success: false,
          response: `Lo siento, hubo un error: ${error.message}`,
          error: error.message
        };

        this.addToHistory({
          type: 'assistant',
          text: errorResponse.response,
          timestamp: Date.now(),
          error: true
        });

        return errorResponse;
      }
    }

    // Si no hay comando específico, usar IA si está disponible
    if (this.aiAnalyzer) {
      return await this.handleGeneralQuery(normalizedText, context);
    }

    // Respuesta por defecto
    const defaultResponse = {
      success: false,
      response: 'No entendí el comando. Di "ayuda" para ver los comandos disponibles.',
      suggestions: this.getSuggestions(normalizedText)
    };

    this.addToHistory({
      type: 'assistant',
      text: defaultResponse.response,
      timestamp: Date.now()
    });

    return defaultResponse;
  }

  /**
   * Encuentra el comando que coincide con el texto
   */
  findMatchingCommand(text) {
    for (const [name, command] of Object.entries(this.commands)) {
      for (const pattern of command.patterns) {
        if (text.includes(pattern)) {
          return { name, ...command };
        }
      }
    }
    return null;
  }

  /**
   * Handlers de comandos
   */

  async handleStatus(text, context) {
    const stats = {
      system: 'operativo',
      tasks: this.autonomousAgent ? 'disponible' : 'no disponible',
      search: this.searchEngine ? 'disponible' : 'no disponible',
      notifications: this.notificationSystem ? this.notificationSystem.getStats() : null
    };

    return {
      success: true,
      response: `Sistema operativo. Todas las funciones están disponibles. ${stats.notifications ? `Tienes ${stats.notifications.unread} notificaciones sin leer.` : ''}`,
      data: stats
    };
  }

  async handleHelp(text, context) {
    const commandList = Object.entries(this.commands)
      .map(([name, cmd]) => `• ${cmd.patterns[0]}: ${cmd.description}`)
      .join('\n');

    return {
      success: true,
      response: `Estos son los comandos que entiendo:\n${commandList}`,
      data: { commands: this.commands }
    };
  }

  async handleExecuteTask(text, context) {
    if (!this.autonomousAgent) {
      return {
        success: false,
        response: 'El sistema autónomo no está disponible'
      };
    }

    // Extraer la tarea del texto
    const taskMatch = text.match(/(?:ejecuta|execute|haz|do|realiza)\s+(.+)/i);
    const task = taskMatch ? taskMatch[1].trim() : text;

    if (!task || task.length < 5) {
      return {
        success: false,
        response: 'Por favor, especifica qué tarea quieres que ejecute'
      };
    }

    return {
      success: true,
      response: `Ejecutando tarea: "${task}"`,
      data: { task },
      action: 'execute-task',
      parameters: { task }
    };
  }

  async handlePause(text, context) {
    if (!this.autonomousAgent) {
      return {
        success: false,
        response: 'No hay ejecución en curso'
      };
    }

    return {
      success: true,
      response: 'Pausando ejecución',
      action: 'pause'
    };
  }

  async handleResume(text, context) {
    return {
      success: true,
      response: 'Reanudando ejecución',
      action: 'resume'
    };
  }

  async handleSearch(text, context) {
    // Extraer query de búsqueda
    const searchMatch = text.match(/(?:busca|search|encuentra|find)\s+(.+)/i);
    const query = searchMatch ? searchMatch[1].trim() : '';

    if (!query) {
      return {
        success: false,
        response: 'Por favor, especifica qué quieres buscar'
      };
    }

    return {
      success: true,
      response: `Buscando: "${query}"`,
      data: { query },
      action: 'search',
      parameters: { query }
    };
  }

  async handleDocument(text, context) {
    // Extraer archivo a documentar
    const docMatch = text.match(/(?:documenta|document)\s+(.+)/i);
    const target = docMatch ? docMatch[1].trim() : 'proyecto';

    return {
      success: true,
      response: `Generando documentación para: "${target}"`,
      data: { target },
      action: 'document',
      parameters: { target }
    };
  }

  async handleNotifications(text, context) {
    if (!this.notificationSystem) {
      return {
        success: false,
        response: 'Sistema de notificaciones no disponible'
      };
    }

    const stats = this.notificationSystem.getStats();
    const unread = stats.unread || 0;

    return {
      success: true,
      response: `Tienes ${unread} notificación${unread !== 1 ? 'es' : ''} sin leer`,
      data: stats,
      action: 'show-notifications'
    };
  }

  async handleClearNotifications(text, context) {
    return {
      success: true,
      response: 'Limpiando notificaciones',
      action: 'clear-notifications'
    };
  }

  async handleLearn(text, context) {
    const learnMatch = text.match(/(?:aprende|learn|investiga)\s+(?:sobre\s+)?(.+)/i);
    const topic = learnMatch ? learnMatch[1].trim() : '';

    if (!topic) {
      return {
        success: false,
        response: 'Por favor, especifica sobre qué tema quieres que aprenda'
      };
    }

    return {
      success: true,
      response: `Aprendiendo sobre: "${topic}"`,
      data: { topic },
      action: 'learn',
      parameters: { topic }
    };
  }

  async handleOpen(text, context) {
    const openMatch = text.match(/(?:abre|open|muestra|show)\s+(.+)/i);
    const target = openMatch ? openMatch[1].trim() : '';

    const viewMap = {
      'dashboard': 'dashboard',
      'análisis': 'analytics',
      'analytics': 'analytics',
      'historial': 'history',
      'history': 'history',
      'reportes': 'reports',
      'reports': 'reports',
      'búsqueda': 'search',
      'search': 'search',
      'documentación': 'docs',
      'docs': 'docs',
      'notificaciones': 'notifications',
      'notifications': 'notifications'
    };

    const view = viewMap[target.toLowerCase()] || target;

    return {
      success: true,
      response: `Abriendo: ${target}`,
      data: { view },
      action: 'open-view',
      parameters: { view }
    };
  }

  async handleGeneralQuery(text, context) {
    // Usar IA para responder query general
    try {
      const response = await this.aiAnalyzer.analyze(text);

      return {
        success: true,
        response: response,
        data: { query: text },
        ai: true
      };
    } catch (error) {
      return {
        success: false,
        response: 'No pude procesar tu pregunta',
        error: error.message
      };
    }
  }

  /**
   * Obtiene sugerencias basadas en el texto
   */
  getSuggestions(text) {
    const suggestions = [];

    // Sugerencias basadas en palabras clave
    if (text.includes('busca') || text.includes('search')) {
      suggestions.push('Intenta: "busca notification-system"');
    }
    if (text.includes('ejecut') || text.includes('haz')) {
      suggestions.push('Intenta: "ejecuta crear un archivo README"');
    }
    if (text.includes('document')) {
      suggestions.push('Intenta: "documenta el archivo core/notification-system.cjs"');
    }

    if (suggestions.length === 0) {
      suggestions.push('Di "ayuda" para ver todos los comandos');
    }

    return suggestions;
  }

  /**
   * Agrega un mensaje al historial
   */
  addToHistory(message) {
    this.conversationHistory.push(message);

    // Mantener límite de historial
    if (this.conversationHistory.length > this.maxHistoryLength) {
      this.conversationHistory.shift();
    }

    this.emit('history:updated', this.conversationHistory);
  }

  /**
   * Obtiene el historial de conversación
   */
  getHistory(limit = 20) {
    return this.conversationHistory.slice(-limit);
  }

  /**
   * Limpia el historial
   */
  clearHistory() {
    this.conversationHistory = [];
    this.emit('history:cleared');
  }

  /**
   * Obtiene estadísticas del procesador
   */
  getStats() {
    const totalMessages = this.conversationHistory.length;
    const userMessages = this.conversationHistory.filter(m => m.type === 'user').length;
    const assistantMessages = this.conversationHistory.filter(m => m.type === 'assistant').length;

    return {
      totalMessages,
      userMessages,
      assistantMessages,
      availableCommands: Object.keys(this.commands).length
    };
  }
}

module.exports = VoiceCommandProcessor;

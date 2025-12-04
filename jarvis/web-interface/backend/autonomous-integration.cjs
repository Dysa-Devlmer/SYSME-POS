// web-interface/backend/autonomous-integration.cjs
// Integración del Autonomous Agent con Socket.io para Dashboard Web

const AutonomousAgentManager = require('../../core/autonomous-agent/autonomous-agent-manager.cjs');

/**
 * Integración del Autonomous Agent con Socket.io
 */
class AutonomousIntegration {
  constructor(io) {
    this.io = io;
    this.agent = null;
    this.isInitialized = false;
    this.currentTask = null;
  }

  /**
   * Inicializa el agente autónomo
   */
  async initialize() {
    if (this.isInitialized) return;

    console.log('🤖 [Autonomous Integration] Inicializando...');

    this.agent = new AutonomousAgentManager({
      projectRoot: process.cwd()
    });

    await this.agent.initialize();

    // Setup event forwarding
    this.setupEventForwarding();

    this.isInitialized = true;
    console.log('✅ [Autonomous Integration] Listo');
  }

  /**
   * Setup event forwarding del agente a Socket.io
   */
  setupEventForwarding() {
    // Notification events
    this.agent.notificationSystem.on('notification', (notification) => {
      this.io.emit('notification:new', notification);
    });

    this.agent.notificationSystem.on('notification:read', (notification) => {
      this.io.emit('notification:read', notification);
    });

    this.agent.notificationSystem.on('notifications:all-read', () => {
      this.io.emit('notification:all-read');
    });

    this.agent.notificationSystem.on('notification:dismissed', (notification) => {
      this.io.emit('notification:dismissed', notification);
    });

    this.agent.notificationSystem.on('notifications:all-dismissed', () => {
      this.io.emit('notification:all-dismissed');
    });

    // Task events
    this.agent.on('task:start', (data) => {
      this.currentTask = data.taskDescription;
      this.io.emit('autonomous:task-start', data);
    });

    this.agent.on('task:planned', (data) => {
      this.io.emit('autonomous:task-planned', data);
    });

    this.agent.on('task:complete', (data) => {
      this.io.emit('autonomous:task-complete', data);
      this.currentTask = null;
    });

    this.agent.on('task:failed', (data) => {
      this.io.emit('autonomous:task-failed', data);
      this.currentTask = null;
    });

    // Plan events
    this.agent.on('plan:start', (data) => {
      this.io.emit('autonomous:plan-start', data);
    });

    this.agent.on('plan:complete', (data) => {
      this.io.emit('autonomous:plan-complete', data);
    });

    // Execution events
    this.agent.on('execution:start', (data) => {
      this.io.emit('autonomous:execution-start', data);
    });

    this.agent.on('execution:complete', (data) => {
      this.io.emit('autonomous:execution-complete', data);
    });

    this.agent.on('execution:failed', (data) => {
      this.io.emit('autonomous:execution-failed', data);
    });

    // Verification events
    this.agent.on('verification:start', (data) => {
      this.io.emit('autonomous:verification-start', data);
    });

    this.agent.on('verification:passed', (data) => {
      this.io.emit('autonomous:verification-passed', data);
    });

    this.agent.on('verification:failed', (data) => {
      this.io.emit('autonomous:verification-failed', data);
    });

    // Subtask events
    this.agent.on('subtask:success', (data) => {
      this.io.emit('autonomous:subtask-success', data);
    });

    this.agent.on('subtask:failed', (data) => {
      this.io.emit('autonomous:subtask-failed', data);
    });

    this.agent.on('subtask:corrected', (data) => {
      this.io.emit('autonomous:subtask-corrected', data);
    });

    // Research events
    this.agent.on('research:start', (data) => {
      this.io.emit('autonomous:research-start', data);
    });

    this.agent.on('research:complete', (data) => {
      this.io.emit('autonomous:research-complete', data);
    });

    // State changes
    this.agent.on('paused', () => {
      this.io.emit('autonomous:paused');
    });

    this.agent.on('resumed', () => {
      this.io.emit('autonomous:resumed');
    });

    this.agent.on('cancelled', (data) => {
      this.io.emit('autonomous:cancelled', data);
    });
  }

  /**
   * Setup socket handlers
   */
  setupSocketHandlers(socket) {
    // Ejecutar tarea autónoma
    socket.on('autonomous:execute-task', async (data) => {
      try {
        if (!this.isInitialized) {
          await this.initialize();
        }

        const { taskDescription, context } = data;

        console.log(`🎯 [Autonomous] Nueva tarea: "${taskDescription}"`);

        // Ejecutar en background (no bloquear socket)
        this.agent.executeTask(taskDescription, context || {})
          .catch(error => {
            console.error('❌ [Autonomous] Error en tarea:', error);
            socket.emit('autonomous:task-error', {
              error: error.message
            });
          });

        // Confirmar que se inició
        socket.emit('autonomous:task-started', {
          taskDescription
        });

      } catch (error) {
        socket.emit('autonomous:error', {
          message: error.message
        });
      }
    });

    // Obtener estado actual
    socket.on('autonomous:get-state', () => {
      try {
        if (!this.isInitialized || !this.agent) {
          socket.emit('autonomous:state', {
            state: 'not-initialized'
          });
          return;
        }

        const state = this.agent.getState();
        socket.emit('autonomous:state', state);
      } catch (error) {
        socket.emit('autonomous:error', {
          message: error.message
        });
      }
    });

    // Obtener estadísticas
    socket.on('autonomous:get-stats', async () => {
      try {
        if (!this.isInitialized) {
          await this.initialize();
        }

        const stats = await this.agent.getStats();
        socket.emit('autonomous:stats', stats);
      } catch (error) {
        socket.emit('autonomous:error', {
          message: error.message
        });
      }
    });

    // Obtener historial de sesiones
    socket.on('autonomous:get-sessions', async () => {
      try {
        if (!this.isInitialized) {
          await this.initialize();
        }

        const sessions = await this.agent.getSessionHistory();
        socket.emit('autonomous:sessions', sessions);
      } catch (error) {
        socket.emit('autonomous:error', {
          message: error.message
        });
      }
    });

    // Pausar ejecución
    socket.on('autonomous:pause', () => {
      try {
        if (this.agent) {
          const success = this.agent.pause();
          socket.emit('autonomous:pause-result', { success });
        }
      } catch (error) {
        socket.emit('autonomous:error', {
          message: error.message
        });
      }
    });

    // Reanudar ejecución
    socket.on('autonomous:resume', () => {
      try {
        if (this.agent) {
          const success = this.agent.resume();
          socket.emit('autonomous:resume-result', { success });
        }
      } catch (error) {
        socket.emit('autonomous:error', {
          message: error.message
        });
      }
    });

    // Cancelar ejecución
    socket.on('autonomous:cancel', () => {
      try {
        if (this.agent) {
          this.agent.cancel();
          socket.emit('autonomous:cancel-result', { success: true });
        }
      } catch (error) {
        socket.emit('autonomous:error', {
          message: error.message
        });
      }
    });

    // Aprender sobre un tema
    socket.on('autonomous:learn', async (data) => {
      try {
        if (!this.isInitialized) {
          await this.initialize();
        }

        const { topic } = data;
        console.log(`📚 [Autonomous] Aprendiendo sobre: "${topic}"`);

        const result = await this.agent.webIntelligence.learnAbout(topic);
        socket.emit('autonomous:learn-result', result);
      } catch (error) {
        socket.emit('autonomous:error', {
          message: error.message
        });
      }
    });

    // Consultar conocimiento
    socket.on('autonomous:query', async (data) => {
      try {
        if (!this.isInitialized) {
          await this.initialize();
        }

        const { question } = data;
        console.log(`❓ [Autonomous] Query: "${question}"`);

        const result = await this.agent.webIntelligence.query(question);
        socket.emit('autonomous:query-result', result);
      } catch (error) {
        socket.emit('autonomous:error', {
          message: error.message
        });
      }
    });

    // Buscar en memoria
    socket.on('autonomous:memory-search', async (data) => {
      try {
        if (!this.isInitialized) {
          await this.initialize();
        }

        const { query, limit } = data;
        const memories = await this.agent.memoryManager.recall(query, limit || 10);
        socket.emit('autonomous:memory-result', { memories });
      } catch (error) {
        socket.emit('autonomous:error', {
          message: error.message
        });
      }
    });

    // =============== MAINTENANCE & REPORTS ===============

    // Obtener lista de reportes
    socket.on('maintenance:get-reports', () => {
      try {
        if (!this.isInitialized) {
          socket.emit('maintenance:reports-list', []);
          return;
        }

        const reports = this.agent.getAvailableReports();
        socket.emit('maintenance:reports-list', reports);
      } catch (error) {
        socket.emit('autonomous:error', {
          message: error.message
        });
      }
    });

    // Obtener contenido de un reporte específico
    socket.on('maintenance:get-report', (filename) => {
      try {
        if (!this.isInitialized) {
          socket.emit('maintenance:report-content', null);
          return;
        }

        const report = this.agent.getReport(filename);
        socket.emit('maintenance:report-content', report);
      } catch (error) {
        socket.emit('autonomous:error', {
          message: error.message
        });
      }
    });

    // Generar reporte manualmente
    socket.on('maintenance:generate-report', async (type) => {
      try {
        if (!this.isInitialized) {
          await this.initialize();
        }

        const report = await this.agent.generateReport(type);
        socket.emit('maintenance:report-generated', report);

        // Enviar lista actualizada
        const reports = this.agent.getAvailableReports();
        socket.emit('maintenance:reports-list', reports);
      } catch (error) {
        socket.emit('autonomous:error', {
          message: error.message
        });
      }
    });

    // Obtener estado del maintenance scheduler
    socket.on('maintenance:get-status', () => {
      try {
        if (!this.isInitialized) {
          socket.emit('maintenance:status', { isRunning: false });
          return;
        }

        const status = this.agent.getMaintenanceStatus();
        socket.emit('maintenance:status', status);
      } catch (error) {
        socket.emit('autonomous:error', {
          message: error.message
        });
      }
    });

    // =============== NOTIFICATIONS ===============

    // Obtener notificaciones
    socket.on('notifications:get', (options) => {
      try {
        if (!this.isInitialized) {
          socket.emit('notifications:list', []);
          return;
        }

        const notifications = this.agent.getNotifications(options || {});
        socket.emit('notifications:list', notifications);
      } catch (error) {
        socket.emit('autonomous:error', {
          message: error.message
        });
      }
    });

    // Obtener estadísticas de notificaciones
    socket.on('notifications:get-stats', () => {
      try {
        if (!this.isInitialized) {
          socket.emit('notifications:stats', { total: 0, unread: 0 });
          return;
        }

        const stats = this.agent.getNotificationStats();
        socket.emit('notifications:stats', stats);
      } catch (error) {
        socket.emit('autonomous:error', {
          message: error.message
        });
      }
    });

    // Marcar notificación como leída
    socket.on('notifications:mark-read', (notificationId) => {
      try {
        if (this.isInitialized) {
          this.agent.markNotificationAsRead(notificationId);
        }
      } catch (error) {
        socket.emit('autonomous:error', {
          message: error.message
        });
      }
    });

    // Marcar todas como leídas
    socket.on('notifications:mark-all-read', () => {
      try {
        if (this.isInitialized) {
          this.agent.markAllNotificationsAsRead();
        }
      } catch (error) {
        socket.emit('autonomous:error', {
          message: error.message
        });
      }
    });

    // Descartar notificación
    socket.on('notifications:dismiss', (notificationId) => {
      try {
        if (this.isInitialized) {
          this.agent.dismissNotification(notificationId);
        }
      } catch (error) {
        socket.emit('autonomous:error', {
          message: error.message
        });
      }
    });

    // Descartar todas las notificaciones
    socket.on('notifications:dismiss-all', () => {
      try {
        if (this.isInitialized) {
          this.agent.dismissAllNotifications();
        }
      } catch (error) {
        socket.emit('autonomous:error', {
          message: error.message
        });
      }
    });

    // Obtener preferencias de notificaciones
    socket.on('notifications:get-preferences', () => {
      try {
        if (!this.isInitialized) {
          socket.emit('notifications:preferences', {});
          return;
        }

        const preferences = this.agent.getNotificationPreferences();
        socket.emit('notifications:preferences', preferences);
      } catch (error) {
        socket.emit('autonomous:error', {
          message: error.message
        });
      }
    });

    // Actualizar preferencias de notificaciones
    socket.on('notifications:update-preferences', (updates) => {
      try {
        if (this.isInitialized) {
          this.agent.updateNotificationPreferences(updates);
          const preferences = this.agent.getNotificationPreferences();
          socket.emit('notifications:preferences', preferences);
        }
      } catch (error) {
        socket.emit('autonomous:error', {
          message: error.message
        });
      }
    });
  }

  /**
   * Obtiene estado del agente
   */
  getAgentState() {
    if (!this.agent) {
      return { state: 'not-initialized' };
    }
    return this.agent.getState();
  }
}

module.exports = AutonomousIntegration;

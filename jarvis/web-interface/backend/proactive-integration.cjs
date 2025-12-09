// web-interface/backend/proactive-integration.cjs
// Integración de JARVIS Proactive Mode con Panel Web via Socket.io

const path = require('path');
const ProactiveAgent = require('../../core/proactive/proactive-agent.cjs');
const FixEngine = require('../../core/proactive/fix-engine.cjs');
const GitManager = require('../../core/proactive/git-manager.cjs');
const PatternDatabase = require('../../core/learning/pattern-database.cjs');

class ProactiveIntegration {
  constructor(io, options = {}) {
    this.io = io;
    this.proactiveAgent = null;
    this.fixEngine = null;
    this.gitManager = null;
    this.patternDatabase = null;
    this.isEnabled = options.enabled !== false;
    this.projectRoot = options.projectRoot || path.resolve(__dirname, '../..');

    // Estado
    this.stats = {
      filesMonitored: 0,
      alertsSent: 0,
      issuesDetected: 0,
      startTime: null
    };

    // Clients conectados
    this.connectedClients = new Set();
  }

  /**
   * Inicializa la integración
   */
  async initialize() {
    if (!this.isEnabled) {
      console.log('⚠️  [Proactive Integration] Deshabilitado en configuración');
      return;
    }

    console.log('🚀 [Proactive Integration] Inicializando...');

    try {
      // Inicializar Proactive Agent
      this.proactiveAgent = new ProactiveAgent({
        projectRoot: this.projectRoot,
        enabled: true,
        autoAnalyze: true,
        learningEnabled: true,
        notifyOnBugs: true,
        notifyOnSecurity: true,
        notifyOnPerformance: true
      });

      // Inicializar Fix Engine
      this.fixEngine = new FixEngine({
        projectRoot: this.projectRoot
      });

      // Inicializar Git Manager
      this.gitManager = new GitManager({
        projectRoot: this.projectRoot,
        autoCommit: false // Requiere aprobación manual
      });

      // Inicializar Pattern Database
      this.patternDatabase = new PatternDatabase({
        dbPath: `${this.projectRoot}/memory/patterns.db`
      });

      await this.patternDatabase.initialize();

      // Setup listeners
      this.setupProactiveListeners();
      this.setupGitListeners();
      this.setupSocketListeners();

      // Iniciar Proactive Agent
      await this.proactiveAgent.start();

      this.stats.startTime = Date.now();

      console.log('✅ [Proactive Integration] Inicializado y activo');

      // Notificar a todos los clientes
      this.broadcastToAll('proactive:started', {
        timestamp: Date.now()
      });

    } catch (error) {
      console.error('❌ [Proactive Integration] Error en inicialización:', error.message);
      this.isEnabled = false;
    }
  }

  /**
   * Configura listeners del Proactive Agent
   */
  setupProactiveListeners() {
    if (!this.proactiveAgent) {
      console.warn('⚠️  ProactiveAgent no disponible, skipping listeners');
      return;
    }

    // Agent ready
    this.proactiveAgent.on('ready', (data) => {
      this.stats.filesMonitored = data.filesWatched;
      this.broadcastToAll('proactive:ready', {
        filesMonitored: data.filesWatched,
        timestamp: Date.now()
      });
    });

    // File changed
    this.proactiveAgent.on('file:changed', (data) => {
      this.broadcastToAll('proactive:file-changed', {
        path: data.path,
        changeType: data.changeType,
        complexity: data.complexity,
        hasErrors: data.hasErrors,
        timestamp: Date.now()
      });
    });

    // Analysis complete
    this.proactiveAgent.on('analysis:complete', (data) => {
      const issueCount = data.analysis.bugs.length +
                        data.analysis.security.length +
                        data.analysis.performance.length;

      this.stats.issuesDetected += issueCount;

      this.broadcastToAll('proactive:analysis-complete', {
        path: data.path,
        priority: data.priority,
        summary: data.analysis.summary,
        issueCount,
        bugs: data.analysis.bugs.length,
        security: data.analysis.security.length,
        performance: data.analysis.performance.length,
        improvements: data.analysis.improvements.length,
        timestamp: data.timestamp
      });
    });

    // Notification (alert importante)
    this.proactiveAgent.on('notification', (notification) => {
      this.stats.alertsSent++;

      // Emitir alerta a todos los clientes
      this.broadcastToAll('proactive:alert', {
        path: notification.path,
        priority: notification.priority,
        message: notification.message,
        analysis: {
          bugs: notification.analysis.bugs,
          security: notification.analysis.security,
          performance: notification.analysis.performance,
          improvements: notification.analysis.improvements.slice(0, 3),
          summary: notification.analysis.summary
        },
        timestamp: notification.timestamp
      });

      console.log(`🔔 [Proactive Integration] Alerta enviada: ${notification.path}`);
    });
  }

  /**
   * Configura listeners del Git Manager
   */
  setupGitListeners() {
    if (!this.gitManager) {
      console.warn('⚠️  GitManager no disponible, skipping listeners');
      return;
    }

    // Commit approval required
    this.gitManager.on('commit:approval-required', (data) => {
      console.log(`📝 [Proactive Integration] Commit requiere aprobación: ${data.fixes.length} fixes`);

      // Emitir a todos los clientes
      this.broadcastToAll('git:commit-pending', {
        fixes: data.fixes,
        message: data.message,
        filesAffected: data.filesAffected,
        timestamp: Date.now()
      });
    });

    // Commit created
    this.gitManager.on('commit:created', (data) => {
      console.log(`✅ [Proactive Integration] Commit creado: ${data.fixes.length} fixes`);

      this.broadcastToAll('git:commit-created', {
        message: data.message,
        fixes: data.fixes.length,
        files: data.files,
        timestamp: Date.now()
      });
    });

    // Commit rejected
    this.gitManager.on('commit:rejected', (data) => {
      console.log(`❌ [Proactive Integration] Commit rechazado`);

      this.broadcastToAll('git:commit-rejected', {
        fixes: data.fixes.length,
        timestamp: Date.now()
      });
    });
  }

  /**
   * Configura listeners de Socket.io
   */
  setupSocketListeners() {
    if (!this.io) {
      console.warn('⚠️  Socket.io no disponible, skipping Socket listeners');
      return;
    }

    this.io.on('connection', (socket) => {
      console.log(`🔌 [Proactive Integration] Cliente conectado: ${socket.id}`);
      this.connectedClients.add(socket.id);

      // Enviar estado actual al nuevo cliente
      socket.emit('proactive:stats', this.getStats());

      // Listen: Cliente solicita análisis manual
      socket.on('proactive:analyze-file', async (data) => {
        console.log(`🔍 [Proactive Integration] Análisis manual solicitado: ${data.filePath}`);

        try {
          const result = await this.proactiveAgent.analyzeFile(data.filePath);

          socket.emit('proactive:analysis-result', {
            path: data.filePath,
            success: !!result,
            analysis: result,
            timestamp: Date.now()
          });
        } catch (error) {
          socket.emit('proactive:error', {
            message: `Error analizando ${data.filePath}: ${error.message}`,
            timestamp: Date.now()
          });
        }
      });

      // Listen: Cliente solicita estadísticas
      socket.on('proactive:get-stats', () => {
        socket.emit('proactive:stats', this.getStats());
      });

      // Listen: Cliente actualiza configuración
      socket.on('proactive:update-config', (config) => {
        console.log('⚙️ [Proactive Integration] Actualizando configuración:', config);
        this.proactiveAgent.updateConfig(config);

        // Confirmar a todos los clientes
        this.broadcastToAll('proactive:config-updated', config);
      });

      // Listen: Cliente solicita fixes pendientes para commit
      socket.on('git:get-pending', () => {
        const pending = this.gitManager.getPendingFixes();
        socket.emit('git:pending-fixes', pending);
      });

      // Listen: Cliente aprueba commit
      socket.on('git:approve-commit', async () => {
        console.log('✅ [Proactive Integration] Commit aprobado por usuario');

        try {
          const result = await this.gitManager.approveCommit();

          socket.emit('git:commit-result', {
            success: result.success,
            message: result.message,
            reason: result.reason,
            timestamp: Date.now()
          });
        } catch (error) {
          socket.emit('git:commit-result', {
            success: false,
            reason: error.message,
            timestamp: Date.now()
          });
        }
      });

      // Listen: Cliente rechaza commit
      socket.on('git:reject-commit', () => {
        console.log('❌ [Proactive Integration] Commit rechazado por usuario');

        this.gitManager.rejectCommit();

        socket.emit('git:commit-rejected', {
          success: true,
          timestamp: Date.now()
        });
      });

      // Listen: Cliente solicita analytics de learning
      socket.on('learning:get-analytics', async () => {
        try {
          const analytics = await this.patternDatabase.getAnalytics();

          socket.emit('learning:analytics', analytics);
        } catch (error) {
          console.error('❌ [Proactive Integration] Error obteniendo analytics:', error.message);
          socket.emit('learning:error', {
            message: error.message,
            timestamp: Date.now()
          });
        }
      });

      // Listen: Cliente solicita aplicar fix
      socket.on('proactive:apply-fix', async (data) => {
        console.log(`🔧 [Proactive Integration] Fix solicitado: ${data.filePath}:${data.issue.line}`);

        try {
          const result = await this.fixEngine.applyFix(
            data.filePath,
            data.issue,
            data.analysis
          );

          if (result.success) {
            console.log(`✅ [Proactive Integration] Fix aplicado exitosamente`);

            // Registrar fix en Git Manager para commit posterior
            this.gitManager.registerFix({
              filePath: data.filePath,
              issue: data.issue,
              changes: result.changes
            });

            // Notificar a todos los clientes
            this.broadcastToAll('proactive:fix-applied', {
              filePath: data.filePath,
              issue: data.issue,
              changes: result.changes,
              timestamp: Date.now()
            });

            socket.emit('proactive:fix-result', {
              success: true,
              changes: result.changes,
              message: 'Fix aplicado exitosamente',
              timestamp: Date.now()
            });
          } else {
            socket.emit('proactive:fix-result', {
              success: false,
              reason: result.reason,
              message: `No se pudo aplicar fix: ${result.reason}`,
              timestamp: Date.now()
            });
          }
        } catch (error) {
          console.error(`❌ [Proactive Integration] Error aplicando fix:`, error);

          socket.emit('proactive:error', {
            message: `Error aplicando fix: ${error.message}`,
            timestamp: Date.now()
          });
        }
      });

      // Disconnect
      socket.on('disconnect', () => {
        console.log(`🔌 [Proactive Integration] Cliente desconectado: ${socket.id}`);
        this.connectedClients.delete(socket.id);
      });
    });
  }

  /**
   * Broadcast a todos los clientes conectados
   */
  broadcastToAll(event, data) {
    this.io.emit(event, data);
  }

  /**
   * Obtiene estadísticas actuales
   */
  getStats() {
    const agentStats = this.proactiveAgent ? this.proactiveAgent.getStats() : {};

    return {
      ...this.stats,
      uptime: this.stats.startTime ? Date.now() - this.stats.startTime : 0,
      agentStats,
      connectedClients: this.connectedClients.size,
      isActive: this.isEnabled && this.proactiveAgent !== null
    };
  }

  /**
   * Detiene el sistema proactivo
   */
  async stop() {
    if (this.proactiveAgent) {
      await this.proactiveAgent.stop();
      console.log('🛑 [Proactive Integration] Detenido');
    }
  }
}

module.exports = ProactiveIntegration;

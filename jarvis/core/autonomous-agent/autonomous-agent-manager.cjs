// core/autonomous-agent/autonomous-agent-manager.cjs
// Autonomous Agent Manager - El cerebro de JARVIS que trabaja solo

const TaskPlanner = require('./task-planner.cjs');
const ExecutionEngine = require('./execution-engine.cjs');
const SelfVerification = require('./self-verification.cjs');
const WebIntelligenceManager = require('../web-intelligence/web-intelligence-manager.cjs');
const MemoryManager = require('../neural-memory/memory-manager.cjs');
const AIAnalyzer = require('../proactive/ai-analyzer.cjs');
const MetricsPersistence = require('../metrics-persistence.cjs');
const MaintenanceScheduler = require('../maintenance-scheduler.cjs');
const NotificationSystem = require('../notification-system.cjs');
const { EventEmitter } = require('events');

/**
 * Autonomous Agent Manager
 *
 * El orquestador principal que hace que JARVIS trabaje solo durante horas.
 *
 * Flujo completo:
 * 1. Recibe tarea compleja del usuario
 * 2. Task Planner la descompone en sub-tareas
 * 3. Execution Engine ejecuta cada sub-tarea
 * 4. Self-Verification verifica cada resultado
 * 5. Si falla verificación, intenta auto-corregir
 * 6. Reporta progreso en tiempo real
 * 7. Aprende de cada ejecución
 */
class AutonomousAgentManager extends EventEmitter {
  constructor(options = {}) {
    super();

    this.projectRoot = options.projectRoot || process.cwd();

    // Inicializar componentes principales
    this.memoryManager = new MemoryManager({
      dbPath: `${this.projectRoot}/memory/jarvis-memory.db`
    });

    this.webIntelligence = new WebIntelligenceManager({
      projectRoot: this.projectRoot
    });

    this.aiAnalyzer = new AIAnalyzer({
      ollamaUrl: options.ollamaUrl
    });

    this.taskPlanner = new TaskPlanner({
      ollamaUrl: options.ollamaUrl,
      model: options.model
    });

    this.executionEngine = new ExecutionEngine({
      projectRoot: this.projectRoot,
      ollamaUrl: options.ollamaUrl,
      model: options.model,
      webIntelligence: this.webIntelligence,
      memoryManager: this.memoryManager
    });

    this.selfVerification = new SelfVerification({
      projectRoot: this.projectRoot,
      ollamaUrl: options.ollamaUrl,
      model: options.model,
      aiAnalyzer: this.aiAnalyzer
    });

    // Sistema de persistencia
    this.metricsPersistence = new MetricsPersistence();

    // Sistema de mantenimiento automático
    this.maintenanceScheduler = new MaintenanceScheduler({
      projectRoot: this.projectRoot,
      metricsPersistence: this.metricsPersistence,
      memoryManager: this.memoryManager,
      webIntelligence: this.webIntelligence,
      sessionRetentionDays: options.sessionRetentionDays || 90,
      logRetentionDays: options.logRetentionDays || 30,
      metricsRetentionDays: options.metricsRetentionDays || 365,
      backupEnabled: options.backupEnabled !== false,
      reportsEnabled: options.reportsEnabled !== false
    });

    // Sistema de notificaciones
    this.notificationSystem = new NotificationSystem({
      projectRoot: this.projectRoot,
      metricsPersistence: this.metricsPersistence,
      maxNotifications: options.maxNotifications || 100,
      retentionDays: options.notificationRetentionDays || 30
    });

    // Estado del agente
    this.state = 'idle'; // idle, planning, executing, verifying, completed, failed
    this.currentTask = null;
    this.currentPlan = null;
    this.currentSubtaskIndex = 0;
    this.sessionResults = [];

    // Configuración
    this.maxAutoCorrections = options.maxAutoCorrections || 2;
    this.pauseOnVerificationFailure = options.pauseOnVerificationFailure !== false;

    // Setup event forwarding
    this.setupEventForwarding();
  }

  /**
   * Inicializa el agente autónomo
   */
  async initialize() {
    console.log('🤖 [Autonomous Agent] Inicializando...');

    await this.memoryManager.initialize();
    await this.webIntelligence.initialize();
    this.metricsPersistence.initialize();

    // Iniciar sistemas automáticos
    this.maintenanceScheduler.start();
    await this.notificationSystem.initialize();

    // Notificación de inicio
    await this.notificationSystem.notify({
      priority: 'success',
      category: 'system',
      title: 'JARVIS Inicializado',
      message: 'Sistema autónomo listo para trabajar'
    });

    console.log('✅ [Autonomous Agent] Sistema listo para trabajar autónomamente');
    this.emit('ready');
  }

  /**
   * Ejecuta una tarea compleja de forma autónoma
   */
  async executeTask(taskDescription, context = {}) {
    console.log(`\n🎯 [Autonomous Agent] Iniciando tarea autónoma: "${taskDescription}"\n`);
    this.emit('task:start', { taskDescription });

    this.state = 'planning';
    this.currentTask = taskDescription;
    this.currentSubtaskIndex = 0;
    this.sessionResults = [];

    const startTime = Date.now();

    try {
      // FASE 1: PLANIFICACIÓN
      console.log('📋 FASE 1: PLANIFICACIÓN\n');
      this.currentPlan = await this.taskPlanner.planTask(taskDescription, context);

      console.log(`\n✅ Plan creado: ${this.currentPlan.subtasks.length} sub-tareas`);
      console.log(`⏱️ Tiempo estimado: ${this.currentPlan.estimation.estimatedTimeHours}h`);
      console.log(`🎚️ Complejidad: ${this.currentPlan.estimation.overallComplexity}\n`);

      this.emit('task:planned', {
        plan: this.currentPlan,
        subtaskCount: this.currentPlan.subtasks.length
      });

      // Notificación de planificación
      await this.notificationSystem.notify({
        priority: 'info',
        category: 'task',
        title: 'Tarea Planificada',
        message: `${this.currentPlan.subtasks.length} sub-tareas creadas para: ${taskDescription.substring(0, 50)}...`,
        data: {
          subtaskCount: this.currentPlan.subtasks.length,
          estimatedTime: this.currentPlan.estimation.estimatedTimeHours,
          complexity: this.currentPlan.estimation.overallComplexity
        }
      });

      // Guardar plan en memoria
      await this.memoryManager.store({
        type: 'task-plan',
        content: {
          task: taskDescription,
          plan: this.currentPlan,
          subtaskCount: this.currentPlan.subtasks.length
        },
        metadata: {
          complexity: this.currentPlan.estimation.overallComplexity,
          estimatedTime: this.currentPlan.estimation.estimatedTimeMinutes
        },
        importance: 0.9
      });

      // FASE 2: EJECUCIÓN
      console.log('🚀 FASE 2: EJECUCIÓN\n');
      this.state = 'executing';

      for (let i = 0; i < this.currentPlan.subtasks.length; i++) {
        this.currentSubtaskIndex = i;
        const subtask = this.currentPlan.subtasks[i];

        console.log(`\n--- Sub-tarea ${i + 1}/${this.currentPlan.subtasks.length} ---`);

        // Verificar dependencias
        if (!this.areDependenciesMet(subtask)) {
          console.log(`⏸️ Dependencias no cumplidas para: "${subtask.title}"`);
          this.sessionResults.push({
            subtask: subtask.id,
            success: false,
            skipped: true,
            reason: 'dependencies-not-met'
          });
          continue;
        }

        // Ejecutar sub-tarea
        let executionResult;
        try {
          executionResult = await this.executionEngine.executeSubtask(subtask, context);
        } catch (executionError) {
          console.error(`❌ Error ejecutando sub-tarea: ${executionError.message}`);
          this.sessionResults.push({
            subtask: subtask.id,
            success: false,
            error: executionError.message,
            phase: 'execution'
          });

          // Decidir si continuar o abortar
          if (this.shouldAbortOnError(subtask, executionError)) {
            throw new Error(`Abortando tarea: error crítico en "${subtask.title}"`);
          }

          continue; // Continuar con siguiente sub-tarea
        }

        // FASE 3: VERIFICACIÓN
        console.log(`\n🔍 FASE 3: VERIFICACIÓN (Sub-tarea ${i + 1})\n`);
        this.state = 'verifying';

        const verificationResult = await this.selfVerification.verify(subtask, executionResult);

        if (verificationResult.passed) {
          // ✅ Verificación exitosa
          console.log(`✅ Sub-tarea ${i + 1} completada y verificada\n`);
          this.sessionResults.push({
            subtask: subtask.id,
            success: true,
            executionResult,
            verificationResult,
            score: verificationResult.score
          });

          // Notificación de sub-tarea exitosa
          await this.notificationSystem.notify({
            priority: 'success',
            category: 'task',
            title: `Sub-tarea ${i + 1}/${this.currentPlan.subtasks.length} Completada`,
            message: subtask.title,
            data: {
              subtaskId: subtask.id,
              score: verificationResult.score,
              type: subtask.type
            }
          });

          this.emit('subtask:success', {
            subtask,
            index: i + 1,
            total: this.currentPlan.subtasks.length,
            score: verificationResult.score
          });

        } else {
          // ❌ Verificación fallida
          console.log(`❌ Sub-tarea ${i + 1} falló verificación (score: ${verificationResult.score}%)\n`);

          // Intentar auto-corrección
          const corrected = await this.attemptAutoCorrection(
            subtask,
            executionResult,
            verificationResult,
            context
          );

          if (corrected) {
            console.log(`✅ Sub-tarea ${i + 1} corregida exitosamente\n`);
            this.sessionResults.push({
              subtask: subtask.id,
              success: true,
              executionResult: corrected.executionResult,
              verificationResult: corrected.verificationResult,
              score: corrected.verificationResult.score,
              corrected: true
            });

            this.emit('subtask:corrected', {
              subtask,
              index: i + 1,
              total: this.currentPlan.subtasks.length
            });
          } else {
            console.log(`💥 Sub-tarea ${i + 1} no pudo ser corregida\n`);
            this.sessionResults.push({
              subtask: subtask.id,
              success: false,
              executionResult,
              verificationResult,
              score: verificationResult.score,
              correctionAttempted: true
            });

            this.emit('subtask:failed', {
              subtask,
              index: i + 1,
              total: this.currentPlan.subtasks.length,
              issues: verificationResult.issues
            });

            // Notificación de error
            await this.notificationSystem.notify({
              priority: 'error',
              category: 'task',
              title: `Error en Sub-tarea ${i + 1}`,
              message: `Falló: ${subtask.title}`,
              data: {
                subtaskId: subtask.id,
                score: verificationResult.score,
                issues: verificationResult.issues
              }
            });

            // Pausar si está configurado
            if (this.pauseOnVerificationFailure) {
              console.log('⏸️ Pausando ejecución por falla en verificación');
              throw new Error(`Verificación fallida en sub-tarea: "${subtask.title}"`);
            }
          }
        }

        this.state = 'executing'; // Volver a ejecutando
      }

      // FASE 4: FINALIZACIÓN
      const endTime = Date.now();
      const duration = Math.round((endTime - startTime) / 1000);

      console.log('\n🎉 TAREA COMPLETADA\n');
      console.log(`⏱️ Duración: ${duration}s`);

      const summary = this.generateSummary();
      console.log(`✅ Exitosas: ${summary.successful}/${summary.total}`);
      console.log(`❌ Fallidas: ${summary.failed}/${summary.total}`);
      console.log(`🔧 Corregidas: ${summary.corrected}/${summary.total}`);
      console.log(`⏭️ Saltadas: ${summary.skipped}/${summary.total}`);
      console.log(`📊 Score promedio: ${summary.averageScore}%\n`);

      this.state = 'completed';

      // Notificación de tarea completada
      await this.notificationSystem.notify({
        priority: summary.failed > 0 ? 'warning' : 'success',
        category: 'task',
        title: 'Tarea Completada',
        message: `${summary.successful}/${summary.total} sub-tareas exitosas en ${duration}s`,
        data: {
          taskDescription,
          duration,
          summary
        }
      });

      this.emit('task:complete', {
        taskDescription,
        duration,
        summary,
        results: this.sessionResults
      });

      // Guardar sesión en memoria
      await this.memoryManager.store({
        type: 'autonomous-session',
        content: {
          task: taskDescription,
          plan: this.currentPlan,
          results: this.sessionResults,
          summary,
          duration
        },
        metadata: {
          successful: summary.successful,
          failed: summary.failed,
          score: summary.averageScore
        },
        importance: 1.0 // Máxima importancia
      });

      // Guardar sesión en persistencia (SQLite)
      const sessionId = `session_${Date.now()}`;
      this.metricsPersistence.saveSession({
        id: sessionId,
        timestamp: Date.now(),
        task: taskDescription,
        state: 'completed',
        duration,
        plan: this.currentPlan,
        summary,
        results: this.sessionResults
      });

      return {
        success: summary.failed === 0,
        taskDescription,
        plan: this.currentPlan,
        results: this.sessionResults,
        summary,
        duration
      };

    } catch (error) {
      console.error(`\n💥 [Autonomous Agent] Error fatal: ${error.message}\n`);

      this.state = 'failed';

      // Notificación de error crítico
      await this.notificationSystem.notify({
        priority: 'critical',
        category: 'error',
        title: 'Tarea Fallida',
        message: `Error: ${error.message}`,
        data: {
          taskDescription,
          error: error.message,
          results: this.sessionResults
        }
      });

      this.emit('task:failed', {
        taskDescription,
        error: error.message,
        results: this.sessionResults
      });

      // Guardar falla en memoria
      await this.memoryManager.store({
        type: 'autonomous-session-failed',
        content: {
          task: taskDescription,
          error: error.message,
          results: this.sessionResults
        },
        metadata: {
          failed: true
        },
        importance: 0.8
      });

      return {
        success: false,
        taskDescription,
        error: error.message,
        results: this.sessionResults
      };
    }
  }

  /**
   * Verifica si las dependencias de una sub-tarea están cumplidas
   */
  areDependenciesMet(subtask) {
    if (!subtask.prerequisites || subtask.prerequisites.length === 0) {
      return true; // No tiene dependencias
    }

    // Verificar que todas las dependencias hayan sido completadas exitosamente
    return subtask.prerequisites.every(prereqId => {
      const prereqResult = this.sessionResults.find(r => r.subtask === prereqId);
      return prereqResult && prereqResult.success;
    });
  }

  /**
   * Decide si abortar en caso de error
   */
  shouldAbortOnError(subtask, error) {
    // Abortar solo si es una tarea crítica o el error es fatal
    return subtask.complexity === 'expert' ||
           error.message.includes('critical') ||
           error.message.includes('fatal');
  }

  /**
   * Intenta auto-corregir una sub-tarea fallida
   */
  async attemptAutoCorrection(subtask, executionResult, verificationResult, context) {
    console.log(`🔧 Intentando auto-corrección...`);

    for (let attempt = 1; attempt <= this.maxAutoCorrections; attempt++) {
      console.log(`   Intento de corrección ${attempt}/${this.maxAutoCorrections}`);

      try {
        // Analizar issues y generar corrección
        const correctionPlan = await this.generateCorrectionPlan(
          subtask,
          executionResult,
          verificationResult
        );

        console.log(`   Plan de corrección: ${correctionPlan.actions.length} acciones`);

        // Ejecutar corrección
        const correctedResult = await this.executionEngine.executeSubtask(
          {
            ...subtask,
            description: correctionPlan.correctedDescription,
            title: `[Corrección] ${subtask.title}`
          },
          context
        );

        // Verificar de nuevo
        const newVerification = await this.selfVerification.verify(subtask, correctedResult);

        if (newVerification.passed) {
          console.log(`   ✅ Corrección exitosa en intento ${attempt}`);
          return {
            executionResult: correctedResult,
            verificationResult: newVerification,
            correctionAttempt: attempt
          };
        } else {
          console.log(`   ❌ Corrección intento ${attempt} falló (score: ${newVerification.score}%)`);
        }

      } catch (correctionError) {
        console.error(`   ❌ Error en corrección: ${correctionError.message}`);
      }
    }

    return null; // No pudo corregir
  }

  /**
   * Genera plan de corrección basado en issues
   */
  async generateCorrectionPlan(subtask, executionResult, verificationResult) {
    const issues = verificationResult.issues || [];

    const prompt = `Analiza estos issues y genera un plan de corrección:

Tarea Original: ${subtask.title}
Descripción: ${subtask.description}

Resultado de ejecución:
${JSON.stringify(executionResult, null, 2)}

Issues encontrados:
${JSON.stringify(issues, null, 2)}

Por favor genera un plan de corrección en formato JSON:
{
  "correctedDescription": "descripción actualizada que resuelve los issues",
  "actions": [
    "acción 1 a tomar",
    "acción 2 a tomar"
  ],
  "focusAreas": ["área1", "área2"]
}`;

    const response = await this.taskPlanner.callOllama(prompt);
    const plan = this.taskPlanner.parseJSON(response);

    return plan || {
      correctedDescription: subtask.description + ' (corregir issues de verificación)',
      actions: ['Revisar código', 'Corregir errores'],
      focusAreas: ['calidad', 'tests']
    };
  }

  /**
   * Genera resumen de la sesión
   */
  generateSummary() {
    const total = this.sessionResults.length;
    const successful = this.sessionResults.filter(r => r.success && !r.skipped).length;
    const failed = this.sessionResults.filter(r => !r.success && !r.skipped).length;
    const skipped = this.sessionResults.filter(r => r.skipped).length;
    const corrected = this.sessionResults.filter(r => r.success && r.corrected).length;

    const scores = this.sessionResults
      .filter(r => r.score !== undefined)
      .map(r => r.score);

    const averageScore = scores.length > 0
      ? Math.round(scores.reduce((sum, s) => sum + s, 0) / scores.length)
      : 0;

    return {
      total,
      successful,
      failed,
      skipped,
      corrected,
      averageScore
    };
  }

  /**
   * Obtiene estado actual
   */
  getState() {
    return {
      state: this.state,
      currentTask: this.currentTask,
      progress: this.currentPlan ? {
        current: this.currentSubtaskIndex + 1,
        total: this.currentPlan.subtasks.length,
        percentage: Math.round(((this.currentSubtaskIndex + 1) / this.currentPlan.subtasks.length) * 100)
      } : null,
      results: this.sessionResults
    };
  }

  /**
   * Pausa ejecución
   */
  pause() {
    if (this.state === 'executing' || this.state === 'verifying') {
      console.log('⏸️ [Autonomous Agent] Pausando...');
      this.state = 'paused';
      this.emit('paused');
      return true;
    }
    return false;
  }

  /**
   * Reanuda ejecución
   */
  resume() {
    if (this.state === 'paused') {
      console.log('▶️ [Autonomous Agent] Reanudando...');
      this.state = 'executing';
      this.emit('resumed');
      return true;
    }
    return false;
  }

  /**
   * Cancela ejecución
   */
  cancel() {
    console.log('🛑 [Autonomous Agent] Cancelando...');
    this.state = 'cancelled';
    this.emit('cancelled', {
      task: this.currentTask,
      results: this.sessionResults
    });
  }

  /**
   * Setup event forwarding
   */
  setupEventForwarding() {
    // Task Planner events
    this.taskPlanner.on('plan:start', (data) => this.emit('plan:start', data));
    this.taskPlanner.on('plan:complete', (data) => this.emit('plan:complete', data));
    this.taskPlanner.on('plan:error', (data) => this.emit('plan:error', data));

    // Execution Engine events
    this.executionEngine.on('subtask:start', (data) => this.emit('execution:start', data));
    this.executionEngine.on('subtask:complete', (data) => this.emit('execution:complete', data));
    this.executionEngine.on('subtask:failed', (data) => this.emit('execution:failed', data));

    // Self-Verification events
    this.selfVerification.on('verification:start', (data) => this.emit('verification:start', data));
    this.selfVerification.on('verification:passed', (data) => this.emit('verification:passed', data));
    this.selfVerification.on('verification:failed', (data) => this.emit('verification:failed', data));

    // Web Intelligence events
    this.webIntelligence.on('learn:start', (data) => this.emit('research:start', data));
    this.webIntelligence.on('learn:complete', (data) => this.emit('research:complete', data));
  }

  /**
   * Obtiene estadísticas globales
   */
  async getStats() {
    // Usar persistencia en lugar de memoria para stats más precisos
    const stats = this.metricsPersistence.getGlobalStats();

    return {
      ...stats,
      webIntelligenceStats: this.webIntelligence.getStats(),
      memoryStats: this.memoryManager.getStats()
    };
  }

  /**
   * Obtiene el historial completo de sesiones
   * @param {Object} options - Opciones de filtrado
   * @returns {Array} - Array de sesiones
   */
  getSessionHistory(options = {}) {
    return this.metricsPersistence.getSessionHistory(options);
  }

  /**
   * Obtiene una sesión específica por ID
   * @param {string} sessionId - ID de la sesión
   * @returns {Object|null} - Sesión o null
   */
  getSession(sessionId) {
    return this.metricsPersistence.getSession(sessionId);
  }

  /**
   * Limpia datos antiguos según políticas de retención
   * @param {Object} retention - Políticas de retención en días
   */
  cleanOldData(retention = {}) {
    return this.metricsPersistence.cleanOldData(retention);
  }

  /**
   * Obtiene el estado del maintenance scheduler
   * @returns {Object} - Estado actual
   */
  getMaintenanceStatus() {
    return this.maintenanceScheduler.getStatus();
  }

  /**
   * Genera reporte manualmente
   * @param {string} type - Tipo de reporte: daily, weekly, monthly
   * @returns {Object} - Reporte generado
   */
  async generateReport(type = 'daily') {
    switch (type) {
      case 'daily':
        return await this.maintenanceScheduler.generateDailyReport();
      case 'weekly':
        return await this.maintenanceScheduler.generateWeeklyReport();
      case 'monthly':
        return await this.maintenanceScheduler.generateMonthlyReport();
      default:
        throw new Error(`Tipo de reporte inválido: ${type}`);
    }
  }

  /**
   * Obtiene lista de reportes disponibles
   * @returns {Array} - Array de reportes
   */
  getAvailableReports() {
    const reportsPath = this.maintenanceScheduler.config.reportsPath;

    if (!require('fs').existsSync(reportsPath)) {
      return [];
    }

    const files = require('fs').readdirSync(reportsPath)
      .filter(f => f.endsWith('.json'))
      .map(f => {
        const fullPath = require('path').join(reportsPath, f);
        const stats = require('fs').statSync(fullPath);
        return {
          name: f,
          path: fullPath,
          size: stats.size,
          created: stats.mtimeMs
        };
      })
      .sort((a, b) => b.created - a.created);

    return files;
  }

  /**
   * Obtiene un reporte específico
   * @param {string} filename - Nombre del archivo de reporte
   * @returns {Object} - Contenido del reporte
   */
  getReport(filename) {
    const reportsPath = this.maintenanceScheduler.config.reportsPath;
    const reportPath = require('path').join(reportsPath, filename);

    if (!require('fs').existsSync(reportPath)) {
      return null;
    }

    const content = require('fs').readFileSync(reportPath, 'utf8');
    return JSON.parse(content);
  }

  /**
   * Métodos del sistema de notificaciones
   */

  getNotifications(options) {
    return this.notificationSystem.getNotifications(options);
  }

  getNotificationStats() {
    return this.notificationSystem.getStats();
  }

  getNotificationPreferences() {
    return this.notificationSystem.getPreferences();
  }

  updateNotificationPreferences(updates) {
    return this.notificationSystem.updatePreferences(updates);
  }

  markNotificationAsRead(notificationId) {
    return this.notificationSystem.markAsRead(notificationId);
  }

  markAllNotificationsAsRead() {
    return this.notificationSystem.markAllAsRead();
  }

  dismissNotification(notificationId) {
    return this.notificationSystem.dismiss(notificationId);
  }

  dismissAllNotifications() {
    return this.notificationSystem.dismissAll();
  }
}

module.exports = AutonomousAgentManager;

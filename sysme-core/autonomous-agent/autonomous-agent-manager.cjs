/**
 * JARVIS Mark VII v2.1.0 - Autonomous Agent Manager
 * Gestor de Agente Autónomo
 *
 * Componentes:
 * - Task Planner: Planifica tareas complejas
 * - Execution Engine: Ejecuta las tareas
 * - Self-Verification: Verifica resultados
 *
 * @module AutonomousAgentManager
 * @version 2.1.0
 */

const EventEmitter = require('events');

class AutonomousAgentManager extends EventEmitter {
  constructor(config = {}) {
    super();

    this.config = {
      maxConcurrentTasks: config.maxConcurrentTasks || 3,
      taskTimeout: config.taskTimeout || 300000, // 5 minutos
      retryAttempts: config.retryAttempts || 2,
      selfVerificationEnabled: config.selfVerificationEnabled !== false,
      ...config
    };

    this.tasks = new Map();
    this.activeTasks = new Map();
    this.completedTasks = [];
    this.isRunning = false;

    // Estadísticas
    this.stats = {
      total: 0,
      successful: 0,
      failed: 0,
      verified: 0,
      averageTime: 0
    };
  }

  /**
   * Inicializa el agente autónomo
   */
  async initialize() {
    console.log('🤖 Inicializando Autonomous Agent Manager...');

    this.isRunning = true;

    // Iniciar ciclo de procesamiento
    this.startProcessingLoop();

    console.log('✅ Autonomous Agent Manager inicializado');
    return true;
  }

  /**
   * Crea y planifica una nueva tarea
   */
  async createTask(taskData) {
    const task = {
      id: `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: taskData.type || 'general',
      description: taskData.description,
      priority: taskData.priority || 'medium',
      complexity: taskData.complexity || 'medium',
      estimatedTime: taskData.estimatedTime || 60000, // 1 minuto
      dependencies: taskData.dependencies || [],
      status: 'planned',
      createdAt: Date.now(),
      startedAt: null,
      completedAt: null,
      duration: null,
      result: null,
      error: null,
      retryCount: 0,
      subtasks: [],
      metadata: taskData.metadata || {}
    };

    // Planificar subtareas
    task.subtasks = await this.planSubtasks(task);

    this.tasks.set(task.id, task);
    this.stats.total++;

    this.emit('task:created', task);

    console.log(`📝 Tarea creada: ${task.id} - ${task.description}`);

    return task;
  }

  /**
   * Planifica subtareas basado en la complejidad
   */
  async planSubtasks(task) {
    const subtasks = [];

    // Lógica de planificación según tipo de tarea
    switch (task.type) {
      case 'analysis':
        subtasks.push(
          { step: 1, action: 'gather_data', description: 'Recopilar datos' },
          { step: 2, action: 'analyze_data', description: 'Analizar datos' },
          { step: 3, action: 'generate_report', description: 'Generar reporte' }
        );
        break;

      case 'optimization':
        subtasks.push(
          { step: 1, action: 'identify_bottlenecks', description: 'Identificar cuellos de botella' },
          { step: 2, action: 'propose_solutions', description: 'Proponer soluciones' },
          { step: 3, action: 'apply_optimizations', description: 'Aplicar optimizaciones' },
          { step: 4, action: 'validate_improvements', description: 'Validar mejoras' }
        );
        break;

      case 'maintenance':
        subtasks.push(
          { step: 1, action: 'check_health', description: 'Verificar estado del sistema' },
          { step: 2, action: 'clean_data', description: 'Limpiar datos obsoletos' },
          { step: 3, action: 'update_indexes', description: 'Actualizar índices' },
          { step: 4, action: 'generate_report', description: 'Generar reporte de mantenimiento' }
        );
        break;

      default:
        subtasks.push(
          { step: 1, action: 'execute', description: task.description }
        );
    }

    return subtasks.map(st => ({
      ...st,
      status: 'pending',
      startedAt: null,
      completedAt: null,
      result: null
    }));
  }

  /**
   * Ejecuta una tarea
   */
  async executeTask(taskId) {
    const task = this.tasks.get(taskId);

    if (!task) {
      throw new Error(`Tarea ${taskId} no encontrada`);
    }

    if (task.status !== 'planned') {
      throw new Error(`Tarea ${taskId} ya está ${task.status}`);
    }

    try {
      task.status = 'executing';
      task.startedAt = Date.now();
      this.activeTasks.set(taskId, task);

      this.emit('task:started', task);

      console.log(`▶️  Ejecutando tarea: ${task.id}`);

      // Ejecutar cada subtarea
      for (const subtask of task.subtasks) {
        subtask.status = 'executing';
        subtask.startedAt = Date.now();

        console.log(`  ▸ Subtarea ${subtask.step}: ${subtask.description}`);

        // Simular ejecución
        const result = await this.executeSubtask(subtask, task);

        subtask.result = result;
        subtask.status = result.success ? 'completed' : 'failed';
        subtask.completedAt = Date.now();

        if (!result.success && this.config.selfVerificationEnabled) {
          throw new Error(`Subtarea ${subtask.step} falló: ${result.error}`);
        }
      }

      // Tarea completada
      task.status = 'completed';
      task.completedAt = Date.now();
      task.duration = task.completedAt - task.startedAt;
      task.result = {
        success: true,
        subtasks: task.subtasks.map(st => ({
          step: st.step,
          action: st.action,
          status: st.status
        }))
      };

      this.stats.successful++;
      this.updateAverageTime(task.duration);

      // Auto-verificación
      if (this.config.selfVerificationEnabled) {
        const verification = await this.selfVerify(task);
        task.verification = verification;

        if (verification.passed) {
          this.stats.verified++;
        }
      }

      this.completedTasks.push(task);
      this.activeTasks.delete(taskId);

      this.emit('task:completed', task);

      console.log(`✅ Tarea completada: ${task.id} (${task.duration}ms)`);

      return task;
    } catch (error) {
      task.status = 'failed';
      task.error = error.message;
      task.completedAt = Date.now();
      task.duration = task.completedAt - task.startedAt;

      this.stats.failed++;
      this.activeTasks.delete(taskId);

      this.emit('task:failed', { task, error });

      console.error(`❌ Tarea fallida: ${task.id} - ${error.message}`);

      // Reintentar si es posible
      if (task.retryCount < this.config.retryAttempts) {
        task.retryCount++;
        task.status = 'planned';
        console.log(`🔄 Reintentando tarea: ${task.id} (intento ${task.retryCount})`);

        return await this.executeTask(taskId);
      }

      return task;
    }
  }

  /**
   * Ejecuta una subtarea
   */
  async executeSubtask(subtask, parentTask) {
    // Simular tiempo de ejecución
    await this.sleep(Math.random() * 2000 + 1000);

    // Simular éxito (95% de probabilidad)
    const success = Math.random() > 0.05;

    return {
      success,
      action: subtask.action,
      description: subtask.description,
      data: success ? { status: 'ok', message: `${subtask.action} completado` } : null,
      error: success ? null : 'Error simulado de ejecución',
      timestamp: Date.now()
    };
  }

  /**
   * Auto-verificación de tarea completada
   */
  async selfVerify(task) {
    console.log(`🔍 Auto-verificando tarea: ${task.id}`);

    const checks = [];

    // 1. Verificar que todas las subtareas se completaron
    const allCompleted = task.subtasks.every(st => st.status === 'completed');
    checks.push({
      name: 'subtasks_completed',
      passed: allCompleted,
      message: allCompleted ? 'Todas las subtareas completadas' : 'Hay subtareas incompletas'
    });

    // 2. Verificar tiempo de ejecución
    const withinTime = task.duration <= (task.estimatedTime * 1.5);
    checks.push({
      name: 'time_check',
      passed: withinTime,
      message: withinTime ? 'Tiempo dentro del estimado' : 'Tiempo excedió estimación'
    });

    // 3. Verificar resultado
    const hasResult = task.result !== null;
    checks.push({
      name: 'has_result',
      passed: hasResult,
      message: hasResult ? 'Resultado presente' : 'Falta resultado'
    });

    // 4. Verificar errores
    const noErrors = !task.error;
    checks.push({
      name: 'no_errors',
      passed: noErrors,
      message: noErrors ? 'Sin errores' : `Error: ${task.error}`
    });

    const allPassed = checks.every(check => check.passed);

    return {
      passed: allPassed,
      checks,
      score: checks.filter(c => c.passed).length / checks.length,
      timestamp: Date.now()
    };
  }

  /**
   * Inicia loop de procesamiento
   */
  startProcessingLoop() {
    this.processingInterval = setInterval(async () => {
      if (!this.isRunning) return;

      // Ejecutar tareas pendientes
      const pendingTasks = Array.from(this.tasks.values())
        .filter(t => t.status === 'planned')
        .sort((a, b) => {
          // Ordenar por prioridad
          const priorityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
          return (priorityOrder[b.priority] || 2) - (priorityOrder[a.priority] || 2);
        });

      // Limitar tareas concurrentes
      const slotsAvailable = this.config.maxConcurrentTasks - this.activeTasks.size;

      for (let i = 0; i < Math.min(slotsAvailable, pendingTasks.length); i++) {
        const task = pendingTasks[i];
        this.executeTask(task.id).catch(err => {
          console.error(`Error ejecutando tarea ${task.id}:`, err);
        });
      }
    }, 5000); // Cada 5 segundos

    console.log('⏰ Loop de procesamiento iniciado');
  }

  /**
   * Obtiene estado de una tarea
   */
  getTaskStatus(taskId) {
    return this.tasks.get(taskId) || null;
  }

  /**
   * Lista todas las tareas
   */
  listTasks(filter = {}) {
    let tasks = Array.from(this.tasks.values());

    if (filter.status) {
      tasks = tasks.filter(t => t.status === filter.status);
    }

    if (filter.type) {
      tasks = tasks.filter(t => t.type === filter.type);
    }

    return tasks.map(t => ({
      id: t.id,
      type: t.type,
      description: t.description,
      status: t.status,
      priority: t.priority,
      createdAt: t.createdAt,
      duration: t.duration
    }));
  }

  /**
   * Obtiene estadísticas
   */
  getStats() {
    return {
      ...this.stats,
      active: this.activeTasks.size,
      pending: Array.from(this.tasks.values()).filter(t => t.status === 'planned').length,
      successRate: this.stats.total > 0
        ? ((this.stats.successful / this.stats.total) * 100).toFixed(1) + '%'
        : '0%'
    };
  }

  /**
   * Actualiza tiempo promedio
   */
  updateAverageTime(duration) {
    const total = this.stats.successful + this.stats.failed;
    this.stats.averageTime = ((this.stats.averageTime * (total - 1)) + duration) / total;
  }

  /**
   * Pausa/reanuda agente
   */
  togglePause() {
    this.isRunning = !this.isRunning;
    console.log(this.isRunning ? '▶️  Agente reanudado' : '⏸️  Agente pausado');
  }

  /**
   * Detiene el agente
   */
  async stop() {
    this.isRunning = false;

    if (this.processingInterval) {
      clearInterval(this.processingInterval);
    }

    // Esperar a que terminen tareas activas
    const activeIds = Array.from(this.activeTasks.keys());
    if (activeIds.length > 0) {
      console.log(`⏳ Esperando ${activeIds.length} tareas activas...`);
      await this.sleep(5000);
    }

    console.log('✅ Autonomous Agent Manager detenido');
  }

  /**
   * Helper: sleep
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

module.exports = AutonomousAgentManager;

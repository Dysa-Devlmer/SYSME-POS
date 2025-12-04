// core/scheduler/task-scheduler.cjs
// Sistema de Tareas Programadas para JARVIS

const EventEmitter = require('events');
const cron = require('node-cron');
const path = require('path');

/**
 * Task Scheduler
 *
 * Sistema de programación de tareas recurrentes y puntuales
 *
 * Características:
 * - Tareas con cron expressions
 * - Tareas puntuales (una vez)
 * - Tareas recurrentes con intervalos
 * - Persistencia en base de datos
 * - Historial de ejecuciones
 * - Retry automático en caso de error
 * - Notificaciones de resultados
 */
class TaskScheduler extends EventEmitter {
  constructor(options = {}) {
    super();

    this.projectRoot = options.projectRoot || process.cwd();
    this.metricsPersistence = options.metricsPersistence;
    this.notificationSystem = options.notificationSystem;
    this.autonomousAgent = options.autonomousAgent;

    // Tareas activas
    this.tasks = new Map(); // taskId -> { config, cronJob, status }
    this.runningTasks = new Map(); // executionId -> { taskId, startTime, ... }

    // Configuración
    this.maxRetries = options.maxRetries || 3;
    this.retryDelay = options.retryDelay || 5000; // ms
    this.maxHistoryPerTask = options.maxHistoryPerTask || 50;

    this.isInitialized = false;
  }

  /**
   * Inicializa el scheduler
   */
  async initialize() {
    if (this.isInitialized) return;

    console.log('⏰ [Task Scheduler] Inicializando...');

    // Crear tablas en base de datos
    if (this.metricsPersistence) {
      await this.initializeDatabase();
    }

    // Cargar tareas existentes
    await this.loadTasks();

    this.isInitialized = true;
    console.log('✅ [Task Scheduler] Sistema inicializado');

    this.emit('initialized');
  }

  /**
   * Inicializa las tablas en la base de datos
   */
  async initializeDatabase() {
    const db = this.metricsPersistence.db;

    // Tabla de tareas programadas
    db.exec(`
      CREATE TABLE IF NOT EXISTS scheduled_tasks (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        description TEXT,
        type TEXT NOT NULL, -- 'cron', 'once', 'interval'
        schedule TEXT NOT NULL, -- cron expression or interval
        action TEXT NOT NULL, -- 'autonomous-task', 'command', 'workflow'
        parameters TEXT, -- JSON
        enabled INTEGER DEFAULT 1,
        max_retries INTEGER DEFAULT 3,
        retry_delay INTEGER DEFAULT 5000,
        notify_on_success INTEGER DEFAULT 0,
        notify_on_error INTEGER DEFAULT 1,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL,
        last_run INTEGER,
        next_run INTEGER
      )
    `);

    // Tabla de ejecuciones
    db.exec(`
      CREATE TABLE IF NOT EXISTS task_executions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        task_id INTEGER NOT NULL,
        execution_id TEXT NOT NULL,
        started_at INTEGER NOT NULL,
        completed_at INTEGER,
        status TEXT NOT NULL, -- 'running', 'success', 'error', 'cancelled'
        result TEXT, -- JSON
        error TEXT,
        retry_count INTEGER DEFAULT 0,
        FOREIGN KEY (task_id) REFERENCES scheduled_tasks(id) ON DELETE CASCADE
      )
    `);

    // Índices
    db.exec(`
      CREATE INDEX IF NOT EXISTS idx_scheduled_tasks_enabled
      ON scheduled_tasks(enabled);
    `);

    db.exec(`
      CREATE INDEX IF NOT EXISTS idx_task_executions_task_id
      ON task_executions(task_id);
    `);

    db.exec(`
      CREATE INDEX IF NOT EXISTS idx_task_executions_status
      ON task_executions(status);
    `);

    console.log('✅ [Task Scheduler] Base de datos inicializada');
  }

  /**
   * Carga tareas desde la base de datos
   */
  async loadTasks() {
    if (!this.metricsPersistence) return;

    const db = this.metricsPersistence.db;
    const tasks = db.prepare(`
      SELECT * FROM scheduled_tasks WHERE enabled = 1
    `).all();

    console.log(`📋 [Task Scheduler] Cargando ${tasks.length} tareas activas...`);

    for (const task of tasks) {
      try {
        await this.scheduleTask({
          id: task.id,
          name: task.name,
          description: task.description,
          type: task.type,
          schedule: task.schedule,
          action: task.action,
          parameters: task.parameters ? JSON.parse(task.parameters) : null,
          maxRetries: task.max_retries,
          retryDelay: task.retry_delay,
          notifyOnSuccess: Boolean(task.notify_on_success),
          notifyOnError: Boolean(task.notify_on_error)
        }, false); // No guardar en DB de nuevo
      } catch (error) {
        console.error(`❌ [Task Scheduler] Error cargando tarea ${task.id}:`, error);
      }
    }
  }

  /**
   * Programa una nueva tarea
   */
  async scheduleTask(taskConfig, persist = true) {
    const {
      id,
      name,
      description = '',
      type, // 'cron', 'once', 'interval'
      schedule, // cron expression, timestamp, or interval in ms
      action, // 'autonomous-task', 'command', 'workflow'
      parameters = null,
      maxRetries = this.maxRetries,
      retryDelay = this.retryDelay,
      notifyOnSuccess = false,
      notifyOnError = true
    } = taskConfig;

    console.log(`⏰ [Task Scheduler] Programando tarea: "${name}" (${type})`);

    // Validar configuración
    if (!name || !type || !schedule || !action) {
      throw new Error('Faltan parámetros requeridos: name, type, schedule, action');
    }

    // Generar ID si no existe
    const taskId = id || Date.now();

    // Guardar en base de datos si es necesario
    if (persist && this.metricsPersistence) {
      const db = this.metricsPersistence.db;
      const now = Date.now();

      const result = db.prepare(`
        INSERT INTO scheduled_tasks (
          name, description, type, schedule, action, parameters,
          max_retries, retry_delay, notify_on_success, notify_on_error,
          created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        name,
        description,
        type,
        schedule,
        action,
        parameters ? JSON.stringify(parameters) : null,
        maxRetries,
        retryDelay,
        notifyOnSuccess ? 1 : 0,
        notifyOnError ? 1 : 0,
        now,
        now
      );

      taskConfig.id = result.lastInsertRowid;
    }

    const task = {
      id: taskConfig.id || taskId,
      name,
      description,
      type,
      schedule,
      action,
      parameters,
      maxRetries,
      retryDelay,
      notifyOnSuccess,
      notifyOnError,
      enabled: true,
      cronJob: null,
      status: 'scheduled'
    };

    // Programar según el tipo
    switch (type) {
      case 'cron':
        task.cronJob = this.scheduleCronTask(task);
        break;

      case 'once':
        task.cronJob = this.scheduleOnceTask(task);
        break;

      case 'interval':
        task.cronJob = this.scheduleIntervalTask(task);
        break;

      default:
        throw new Error(`Tipo de tarea no soportado: ${type}`);
    }

    this.tasks.set(task.id, task);

    this.emit('task:scheduled', task);
    console.log(`✅ [Task Scheduler] Tarea programada: ${name} (ID: ${task.id})`);

    return task;
  }

  /**
   * Programa una tarea con cron expression
   */
  scheduleCronTask(task) {
    if (!cron.validate(task.schedule)) {
      throw new Error(`Expresión cron inválida: ${task.schedule}`);
    }

    return cron.schedule(task.schedule, async () => {
      await this.executeTask(task.id);
    }, {
      scheduled: true
    });
  }

  /**
   * Programa una tarea que se ejecuta una sola vez
   */
  scheduleOnceTask(task) {
    const targetTime = parseInt(task.schedule);
    const delay = targetTime - Date.now();

    if (delay <= 0) {
      throw new Error('El tiempo de ejecución ya pasó');
    }

    const timeout = setTimeout(async () => {
      await this.executeTask(task.id);
      // Después de ejecutar, deshabilitar la tarea
      await this.disableTask(task.id);
    }, delay);

    return { stop: () => clearTimeout(timeout) };
  }

  /**
   * Programa una tarea con intervalo
   */
  scheduleIntervalTask(task) {
    const interval = parseInt(task.schedule);

    if (interval < 1000) {
      throw new Error('El intervalo debe ser al menos 1 segundo');
    }

    const intervalId = setInterval(async () => {
      await this.executeTask(task.id);
    }, interval);

    return { stop: () => clearInterval(intervalId) };
  }

  /**
   * Ejecuta una tarea
   */
  async executeTask(taskId, retryCount = 0) {
    const task = this.tasks.get(taskId);
    if (!task) {
      console.error(`❌ [Task Scheduler] Tarea no encontrada: ${taskId}`);
      return;
    }

    if (!task.enabled) {
      console.log(`⏸️ [Task Scheduler] Tarea deshabilitada: ${task.name}`);
      return;
    }

    const executionId = `${taskId}-${Date.now()}`;
    const startTime = Date.now();

    console.log(`▶️ [Task Scheduler] Ejecutando: ${task.name} (${executionId})`);

    // Registrar inicio de ejecución
    this.runningTasks.set(executionId, {
      taskId,
      executionId,
      startTime,
      retryCount
    });

    // Guardar en DB
    if (this.metricsPersistence) {
      const db = this.metricsPersistence.db;
      db.prepare(`
        INSERT INTO task_executions (
          task_id, execution_id, started_at, status, retry_count
        ) VALUES (?, ?, ?, 'running', ?)
      `).run(taskId, executionId, startTime, retryCount);

      // Actualizar last_run en la tarea
      db.prepare(`
        UPDATE scheduled_tasks SET last_run = ? WHERE id = ?
      `).run(startTime, taskId);
    }

    this.emit('task:started', { taskId, executionId, task });

    try {
      // Ejecutar la acción
      const result = await this.executeAction(task.action, task.parameters);

      const endTime = Date.now();
      const duration = endTime - startTime;

      console.log(`✅ [Task Scheduler] Completada: ${task.name} (${duration}ms)`);

      // Registrar éxito
      this.runningTasks.delete(executionId);

      if (this.metricsPersistence) {
        const db = this.metricsPersistence.db;
        db.prepare(`
          UPDATE task_executions
          SET completed_at = ?, status = 'success', result = ?
          WHERE execution_id = ?
        `).run(endTime, JSON.stringify(result), executionId);
      }

      // Notificar si está configurado
      if (task.notifyOnSuccess && this.notificationSystem) {
        await this.notificationSystem.notify({
          priority: 'success',
          category: 'task',
          title: `Tarea Completada: ${task.name}`,
          message: `Ejecución exitosa en ${duration}ms`,
          data: { taskId, executionId, duration, result }
        });
      }

      this.emit('task:completed', { taskId, executionId, result, duration });

      // Limpiar historial antiguo
      await this.cleanupHistory(taskId);

      return result;

    } catch (error) {
      console.error(`❌ [Task Scheduler] Error en tarea ${task.name}:`, error);

      const endTime = Date.now();
      const duration = endTime - startTime;

      // Registrar error
      if (this.metricsPersistence) {
        const db = this.metricsPersistence.db;
        db.prepare(`
          UPDATE task_executions
          SET completed_at = ?, status = 'error', error = ?
          WHERE execution_id = ?
        `).run(endTime, error.message, executionId);
      }

      // Intentar retry si está configurado
      if (retryCount < task.maxRetries) {
        console.log(`🔄 [Task Scheduler] Reintentando en ${task.retryDelay}ms (${retryCount + 1}/${task.maxRetries})...`);

        setTimeout(async () => {
          await this.executeTask(taskId, retryCount + 1);
        }, task.retryDelay);

      } else {
        // Ya no hay más retries
        this.runningTasks.delete(executionId);

        // Notificar error
        if (task.notifyOnError && this.notificationSystem) {
          await this.notificationSystem.notify({
            priority: 'error',
            category: 'task',
            title: `Error en Tarea: ${task.name}`,
            message: error.message,
            data: { taskId, executionId, error: error.message }
          });
        }

        this.emit('task:error', { taskId, executionId, error, duration });
      }

      throw error;
    }
  }

  /**
   * Ejecuta una acción específica
   */
  async executeAction(action, parameters) {
    switch (action) {
      case 'autonomous-task':
        return await this.executeAutonomousTask(parameters);

      case 'command':
        return await this.executeCommand(parameters);

      case 'workflow':
        return await this.executeWorkflow(parameters);

      default:
        throw new Error(`Acción no soportada: ${action}`);
    }
  }

  /**
   * Ejecuta una tarea autónoma
   */
  async executeAutonomousTask(parameters) {
    if (!this.autonomousAgent) {
      throw new Error('Autonomous agent no disponible');
    }

    const { task } = parameters;

    // Usar el autonomous agent para ejecutar la tarea
    const result = await this.autonomousAgent.executeTask(task);

    return { type: 'autonomous-task', task, result };
  }

  /**
   * Ejecuta un comando
   */
  async executeCommand(parameters) {
    const { command, args = [] } = parameters;

    // Aquí podrías ejecutar comandos del sistema, scripts, etc.
    // Por seguridad, deberías validar los comandos permitidos

    return { type: 'command', command, args, executed: true };
  }

  /**
   * Ejecuta un workflow (secuencia de acciones)
   */
  async executeWorkflow(parameters) {
    const { steps } = parameters;

    if (!Array.isArray(steps) || steps.length === 0) {
      throw new Error('Workflow debe tener al menos un paso');
    }

    const results = [];

    for (let i = 0; i < steps.length; i++) {
      const step = steps[i];
      console.log(`▶️ [Workflow] Paso ${i + 1}/${steps.length}: ${step.action}`);

      try {
        const result = await this.executeAction(step.action, step.parameters);
        results.push({ step: i + 1, success: true, result });
      } catch (error) {
        console.error(`❌ [Workflow] Error en paso ${i + 1}:`, error);
        results.push({ step: i + 1, success: false, error: error.message });

        // Si el paso es crítico, detener el workflow
        if (step.critical !== false) {
          throw new Error(`Workflow detenido en paso ${i + 1}: ${error.message}`);
        }
      }
    }

    return { type: 'workflow', totalSteps: steps.length, results };
  }

  /**
   * Obtiene una tarea por ID
   */
  getTask(taskId) {
    return this.tasks.get(taskId);
  }

  /**
   * Obtiene todas las tareas
   */
  getAllTasks() {
    return Array.from(this.tasks.values());
  }

  /**
   * Obtiene tareas filtradas
   */
  getTasks(filter = {}) {
    let tasks = this.getAllTasks();

    if (filter.enabled !== undefined) {
      tasks = tasks.filter(t => t.enabled === filter.enabled);
    }

    if (filter.type) {
      tasks = tasks.filter(t => t.type === filter.type);
    }

    if (filter.action) {
      tasks = tasks.filter(t => t.action === filter.action);
    }

    return tasks;
  }

  /**
   * Actualiza una tarea
   */
  async updateTask(taskId, updates) {
    const task = this.tasks.get(taskId);
    if (!task) {
      throw new Error(`Tarea no encontrada: ${taskId}`);
    }

    console.log(`📝 [Task Scheduler] Actualizando tarea: ${task.name}`);

    // Si se actualiza el schedule, reprogramar
    const needsReschedule = updates.schedule && updates.schedule !== task.schedule;

    // Actualizar en memoria
    Object.assign(task, updates);

    // Actualizar en base de datos
    if (this.metricsPersistence) {
      const db = this.metricsPersistence.db;
      const fields = [];
      const values = [];

      for (const [key, value] of Object.entries(updates)) {
        const dbKey = key.replace(/([A-Z])/g, '_$1').toLowerCase();
        fields.push(`${dbKey} = ?`);
        values.push(typeof value === 'object' ? JSON.stringify(value) : value);
      }

      values.push(Date.now()); // updated_at
      fields.push('updated_at = ?');

      values.push(taskId);

      db.prepare(`
        UPDATE scheduled_tasks SET ${fields.join(', ')} WHERE id = ?
      `).run(...values);
    }

    // Reprogramar si es necesario
    if (needsReschedule) {
      await this.rescheduleTask(taskId);
    }

    this.emit('task:updated', task);

    return task;
  }

  /**
   * Reprograma una tarea
   */
  async rescheduleTask(taskId) {
    const task = this.tasks.get(taskId);
    if (!task) {
      throw new Error(`Tarea no encontrada: ${taskId}`);
    }

    console.log(`🔄 [Task Scheduler] Reprogramando: ${task.name}`);

    // Detener tarea actual
    if (task.cronJob) {
      task.cronJob.stop();
    }

    // Reprogramar según el tipo
    switch (task.type) {
      case 'cron':
        task.cronJob = this.scheduleCronTask(task);
        break;

      case 'once':
        task.cronJob = this.scheduleOnceTask(task);
        break;

      case 'interval':
        task.cronJob = this.scheduleIntervalTask(task);
        break;
    }

    this.emit('task:rescheduled', task);
  }

  /**
   * Habilita una tarea
   */
  async enableTask(taskId) {
    return await this.updateTask(taskId, { enabled: true });
  }

  /**
   * Deshabilita una tarea
   */
  async disableTask(taskId) {
    const task = this.tasks.get(taskId);
    if (!task) {
      throw new Error(`Tarea no encontrada: ${taskId}`);
    }

    console.log(`⏸️ [Task Scheduler] Deshabilitando: ${task.name}`);

    // Detener cron job
    if (task.cronJob) {
      task.cronJob.stop();
    }

    // Actualizar estado
    await this.updateTask(taskId, { enabled: false });

    this.emit('task:disabled', task);
  }

  /**
   * Elimina una tarea
   */
  async deleteTask(taskId) {
    const task = this.tasks.get(taskId);
    if (!task) {
      throw new Error(`Tarea no encontrada: ${taskId}`);
    }

    console.log(`🗑️ [Task Scheduler] Eliminando: ${task.name}`);

    // Detener cron job
    if (task.cronJob) {
      task.cronJob.stop();
    }

    // Eliminar de memoria
    this.tasks.delete(taskId);

    // Eliminar de base de datos
    if (this.metricsPersistence) {
      const db = this.metricsPersistence.db;
      db.prepare('DELETE FROM scheduled_tasks WHERE id = ?').run(taskId);
      db.prepare('DELETE FROM task_executions WHERE task_id = ?').run(taskId);
    }

    this.emit('task:deleted', { taskId, task });
  }

  /**
   * Obtiene el historial de ejecuciones de una tarea
   */
  getTaskHistory(taskId, limit = 20) {
    if (!this.metricsPersistence) return [];

    const db = this.metricsPersistence.db;
    return db.prepare(`
      SELECT * FROM task_executions
      WHERE task_id = ?
      ORDER BY started_at DESC
      LIMIT ?
    `).all(taskId, limit);
  }

  /**
   * Limpia el historial antiguo de una tarea
   */
  async cleanupHistory(taskId) {
    if (!this.metricsPersistence) return;

    const db = this.metricsPersistence.db;

    // Mantener solo las últimas N ejecuciones
    db.prepare(`
      DELETE FROM task_executions
      WHERE task_id = ? AND id NOT IN (
        SELECT id FROM task_executions
        WHERE task_id = ?
        ORDER BY started_at DESC
        LIMIT ?
      )
    `).run(taskId, taskId, this.maxHistoryPerTask);
  }

  /**
   * Obtiene estadísticas del scheduler
   */
  getStats() {
    const allTasks = this.getAllTasks();
    const enabledTasks = allTasks.filter(t => t.enabled);

    const stats = {
      totalTasks: allTasks.length,
      enabledTasks: enabledTasks.length,
      disabledTasks: allTasks.length - enabledTasks.length,
      runningTasks: this.runningTasks.size,
      byType: {},
      byAction: {}
    };

    // Estadísticas por tipo
    for (const task of allTasks) {
      stats.byType[task.type] = (stats.byType[task.type] || 0) + 1;
      stats.byAction[task.action] = (stats.byAction[task.action] || 0) + 1;
    }

    // Estadísticas de ejecuciones si hay DB
    if (this.metricsPersistence) {
      const db = this.metricsPersistence.db;

      const executionStats = db.prepare(`
        SELECT
          COUNT(*) as total,
          SUM(CASE WHEN status = 'success' THEN 1 ELSE 0 END) as successful,
          SUM(CASE WHEN status = 'error' THEN 1 ELSE 0 END) as failed,
          AVG(CASE WHEN status = 'success' THEN completed_at - started_at ELSE NULL END) as avgDuration
        FROM task_executions
      `).get();

      Object.assign(stats, {
        totalExecutions: executionStats.total,
        successfulExecutions: executionStats.successful,
        failedExecutions: executionStats.failed,
        avgExecutionTime: executionStats.avgDuration ? Math.round(executionStats.avgDuration) : 0
      });
    }

    return stats;
  }

  /**
   * Detiene el scheduler y todas las tareas
   */
  async shutdown() {
    console.log('🛑 [Task Scheduler] Deteniendo...');

    // Detener todas las tareas
    for (const task of this.tasks.values()) {
      if (task.cronJob) {
        task.cronJob.stop();
      }
    }

    this.tasks.clear();
    this.runningTasks.clear();

    console.log('✅ [Task Scheduler] Detenido');
  }
}

module.exports = TaskScheduler;

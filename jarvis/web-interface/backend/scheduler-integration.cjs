// web-interface/backend/scheduler-integration.cjs
// Integración del Task Scheduler y Workflow Manager con Socket.io

const TaskScheduler = require('../../core/scheduler/task-scheduler.cjs');
const WorkflowManager = require('../../core/scheduler/workflow-manager.cjs');

/**
 * Integración de Scheduler con Socket.io
 */
class SchedulerIntegration {
  constructor(io, options = {}) {
    this.io = io;
    this.options = options;
    this.taskScheduler = null;
    this.workflowManager = null;
    this.isInitialized = false;
  }

  /**
   * Inicializa el scheduler
   */
  async initialize() {
    if (this.isInitialized) return;

    console.log('⏰ [Scheduler Integration] Inicializando...');

    const autonomousIntegration = this.options.autonomousIntegration;
    const codeSearchIntegration = this.options.codeSearchIntegration;
    const docGeneratorIntegration = this.options.docGeneratorIntegration;

    const autonomousAgent = autonomousIntegration?.agent;
    const metricsPersistence = autonomousAgent?.metricsPersistence;
    const notificationSystem = autonomousAgent?.notificationSystem;
    const codeIndexer = codeSearchIntegration?.codeIndexer;
    const docGenerator = docGeneratorIntegration?.docGenerator;

    // Inicializar Task Scheduler
    this.taskScheduler = new TaskScheduler({
      projectRoot: process.cwd(),
      metricsPersistence,
      notificationSystem,
      autonomousAgent
    });

    await this.taskScheduler.initialize();

    // Inicializar Workflow Manager
    this.workflowManager = new WorkflowManager({
      projectRoot: process.cwd(),
      metricsPersistence,
      taskScheduler: this.taskScheduler,
      autonomousAgent,
      codeIndexer,
      docGenerator
    });

    await this.workflowManager.initialize();

    // Escuchar eventos
    this.setupEventListeners();

    this.isInitialized = true;
    console.log('✅ [Scheduler Integration] Listo');
  }

  /**
   * Setup de event listeners
   */
  setupEventListeners() {
    // Task Scheduler events
    this.taskScheduler.on('task:scheduled', (task) => {
      this.io.emit('scheduler:task-created', task);
    });

    this.taskScheduler.on('task:started', (data) => {
      this.io.emit('scheduler:task-started', data);
    });

    this.taskScheduler.on('task:completed', (data) => {
      this.io.emit('scheduler:task-completed', data);
    });

    this.taskScheduler.on('task:error', (data) => {
      this.io.emit('scheduler:task-error', data);
    });

    this.taskScheduler.on('task:updated', (task) => {
      this.io.emit('scheduler:task-updated', task);
    });

    this.taskScheduler.on('task:deleted', (data) => {
      this.io.emit('scheduler:task-deleted', data);
    });

    // Workflow Manager events
    this.workflowManager.on('workflow:created', (workflow) => {
      this.io.emit('workflows:created', workflow);
    });

    this.workflowManager.on('workflow:started', (data) => {
      this.io.emit('workflows:execution-started', data);
    });

    this.workflowManager.on('workflow:step-completed', (data) => {
      this.io.emit('workflows:step-completed', data);
    });

    this.workflowManager.on('workflow:completed', (data) => {
      this.io.emit('workflows:execution-completed', data);
    });

    this.workflowManager.on('workflow:error', (data) => {
      this.io.emit('workflows:execution-error', data);
    });

    this.workflowManager.on('workflow:deleted', (data) => {
      this.io.emit('workflows:deleted', data);
    });
  }

  /**
   * Setup de handlers de socket
   */
  setupSocketHandlers(socket) {
    // === TASK SCHEDULER HANDLERS ===

    // Obtener todas las tareas
    socket.on('scheduler:get-tasks', () => {
      try {
        if (!this.taskScheduler) {
          socket.emit('scheduler:tasks', []);
          return;
        }

        const tasks = this.taskScheduler.getAllTasks();
        socket.emit('scheduler:tasks', tasks);

      } catch (error) {
        console.error('Error obteniendo tareas:', error);
        socket.emit('scheduler:error', { message: error.message });
      }
    });

    // Obtener estadísticas
    socket.on('scheduler:get-stats', () => {
      try {
        if (!this.taskScheduler) {
          socket.emit('scheduler:stats', {});
          return;
        }

        const stats = this.taskScheduler.getStats();
        socket.emit('scheduler:stats', stats);

      } catch (error) {
        console.error('Error obteniendo estadísticas:', error);
        socket.emit('scheduler:error', { message: error.message });
      }
    });

    // Crear tarea
    socket.on('scheduler:create-task', async (taskConfig) => {
      try {
        if (!this.taskScheduler) {
          throw new Error('Task scheduler no disponible');
        }

        console.log('📋 [Scheduler Integration] Creando tarea:', taskConfig.name);

        const task = await this.taskScheduler.scheduleTask(taskConfig);

        socket.emit('scheduler:task-created', task);

      } catch (error) {
        console.error('Error creando tarea:', error);
        socket.emit('scheduler:error', { message: error.message });
      }
    });

    // Ejecutar tarea manualmente
    socket.on('scheduler:execute-task', async (data) => {
      try {
        if (!this.taskScheduler) {
          throw new Error('Task scheduler no disponible');
        }

        const { taskId } = data;
        console.log(`▶️ [Scheduler Integration] Ejecutando tarea: ${taskId}`);

        await this.taskScheduler.executeTask(taskId);

      } catch (error) {
        console.error('Error ejecutando tarea:', error);
        socket.emit('scheduler:error', { message: error.message });
      }
    });

    // Toggle tarea (habilitar/deshabilitar)
    socket.on('scheduler:toggle-task', async (data) => {
      try {
        if (!this.taskScheduler) {
          throw new Error('Task scheduler no disponible');
        }

        const { taskId, enabled } = data;

        if (enabled) {
          await this.taskScheduler.enableTask(taskId);
        } else {
          await this.taskScheduler.disableTask(taskId);
        }

        const task = this.taskScheduler.getTask(taskId);
        socket.emit('scheduler:task-updated', task);

      } catch (error) {
        console.error('Error toggling tarea:', error);
        socket.emit('scheduler:error', { message: error.message });
      }
    });

    // Eliminar tarea
    socket.on('scheduler:delete-task', async (data) => {
      try {
        if (!this.taskScheduler) {
          throw new Error('Task scheduler no disponible');
        }

        const { taskId } = data;
        console.log(`🗑️ [Scheduler Integration] Eliminando tarea: ${taskId}`);

        await this.taskScheduler.deleteTask(taskId);

        socket.emit('scheduler:task-deleted', { taskId });

      } catch (error) {
        console.error('Error eliminando tarea:', error);
        socket.emit('scheduler:error', { message: error.message });
      }
    });

    // Obtener historial de una tarea
    socket.on('scheduler:get-task-history', (data) => {
      try {
        if (!this.taskScheduler) {
          socket.emit('scheduler:task-history', []);
          return;
        }

        const { taskId, limit = 20 } = data;
        const history = this.taskScheduler.getTaskHistory(taskId, limit);

        socket.emit('scheduler:task-history', history);

      } catch (error) {
        console.error('Error obteniendo historial:', error);
        socket.emit('scheduler:error', { message: error.message });
      }
    });

    // === WORKFLOW MANAGER HANDLERS ===

    // Obtener todos los workflows
    socket.on('workflows:get-list', () => {
      try {
        if (!this.workflowManager) {
          socket.emit('workflows:list', []);
          return;
        }

        const workflows = this.workflowManager.getAllWorkflows();
        socket.emit('workflows:list', workflows);

      } catch (error) {
        console.error('Error obteniendo workflows:', error);
        socket.emit('workflows:error', { message: error.message });
      }
    });

    // Obtener templates
    socket.on('workflows:get-templates', () => {
      try {
        if (!this.workflowManager) {
          socket.emit('workflows:templates', {});
          return;
        }

        const templates = this.workflowManager.getTemplates();
        socket.emit('workflows:templates', templates);

      } catch (error) {
        console.error('Error obteniendo templates:', error);
        socket.emit('workflows:error', { message: error.message });
      }
    });

    // Obtener estadísticas
    socket.on('workflows:get-stats', () => {
      try {
        if (!this.workflowManager) {
          socket.emit('workflows:stats', {});
          return;
        }

        const stats = this.workflowManager.getStats();
        socket.emit('workflows:stats', stats);

      } catch (error) {
        console.error('Error obteniendo estadísticas:', error);
        socket.emit('workflows:error', { message: error.message });
      }
    });

    // Crear workflow
    socket.on('workflows:create', async (workflowConfig) => {
      try {
        if (!this.workflowManager) {
          throw new Error('Workflow manager no disponible');
        }

        console.log('🔄 [Scheduler Integration] Creando workflow:', workflowConfig.name);

        const workflow = await this.workflowManager.createWorkflow(workflowConfig);

        socket.emit('workflows:created', workflow);

      } catch (error) {
        console.error('Error creando workflow:', error);
        socket.emit('workflows:error', { message: error.message });
      }
    });

    // Crear workflow desde template
    socket.on('workflows:create-from-template', async (data) => {
      try {
        if (!this.workflowManager) {
          throw new Error('Workflow manager no disponible');
        }

        const { templateName, customizations = {} } = data;
        console.log('✨ [Scheduler Integration] Creando workflow desde template:', templateName);

        const workflow = await this.workflowManager.createFromTemplate(
          templateName,
          customizations
        );

        socket.emit('workflows:created', workflow);

      } catch (error) {
        console.error('Error creando workflow desde template:', error);
        socket.emit('workflows:error', { message: error.message });
      }
    });

    // Ejecutar workflow
    socket.on('workflows:execute', async (data) => {
      try {
        if (!this.workflowManager) {
          throw new Error('Workflow manager no disponible');
        }

        const { workflowId, context = {} } = data;
        console.log(`▶️ [Scheduler Integration] Ejecutando workflow: ${workflowId}`);

        const result = await this.workflowManager.executeWorkflow(workflowId, context);

        socket.emit('workflows:execution-result', result);

      } catch (error) {
        console.error('Error ejecutando workflow:', error);
        socket.emit('workflows:error', { message: error.message });
      }
    });

    // Eliminar workflow
    socket.on('workflows:delete', async (data) => {
      try {
        if (!this.workflowManager) {
          throw new Error('Workflow manager no disponible');
        }

        const { workflowId } = data;
        console.log(`🗑️ [Scheduler Integration] Eliminando workflow: ${workflowId}`);

        await this.workflowManager.deleteWorkflow(workflowId);

        socket.emit('workflows:deleted', { workflowId });

      } catch (error) {
        console.error('Error eliminando workflow:', error);
        socket.emit('workflows:error', { message: error.message });
      }
    });

    // Obtener historial de un workflow
    socket.on('workflows:get-history', (data) => {
      try {
        if (!this.workflowManager) {
          socket.emit('workflows:history', []);
          return;
        }

        const { workflowId, limit = 20 } = data;
        const history = this.workflowManager.getWorkflowHistory(workflowId, limit);

        socket.emit('workflows:history', history);

      } catch (error) {
        console.error('Error obteniendo historial:', error);
        socket.emit('workflows:error', { message: error.message });
      }
    });
  }
}

module.exports = SchedulerIntegration;

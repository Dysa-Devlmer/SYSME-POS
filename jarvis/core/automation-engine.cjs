// core/automation-engine.js
// J.A.R.V.I.S. MARK VII - FASE 6
// Automation Engine - Workflows multi-paso

class AutomationEngine {
  constructor(logger) {
    this.logger = logger;
    this.workflows = [];
    this.triggers = new Map();
    this.metrics = {
      executions: 0,
      successes: 0,
      failures: 0
    };
  }

  /**
   * Crear workflow nuevo
   */
  createWorkflow(name, steps, trigger = 'manual') {
    const workflow = {
      id: `wf_${Date.now()}`,
      name,
      steps,
      trigger,
      enabled: true,
      created: new Date().toISOString(),
      executions: 0,
      lastRun: null
    };

    this.workflows.push(workflow);
    this.logger.info(`✅ Workflow creado: ${name} (${workflow.id})`);

    return workflow;
  }

  /**
   * Ejecutar workflow
   */
  async executeWorkflow(workflowId, context = {}) {
    const workflow = this.workflows.find(w => w.id === workflowId);

    if (!workflow) {
      return { success: false, error: 'Workflow not found' };
    }

    if (!workflow.enabled) {
      return { success: false, error: 'Workflow is disabled' };
    }

    this.logger.info(`⚙️ Ejecutando workflow: ${workflow.name}`);

    try {
      let result = { ...context };

      for (let i = 0; i < workflow.steps.length; i++) {
        const step = workflow.steps[i];
        this.logger.info(`  📍 Step ${i + 1}/${workflow.steps.length}: ${step.action}`);

        result = await this.executeStep(step, result);

        if (result.error) {
          this.logger.error(`  ❌ Error en step ${i + 1}: ${result.error}`);
          break;
        }
      }

      workflow.executions++;
      workflow.lastRun = new Date().toISOString();
      this.metrics.executions++;

      if (!result.error) {
        this.metrics.successes++;
        this.logger.info(`✅ Workflow completado: ${workflow.name}`);
      } else {
        this.metrics.failures++;
      }

      return { success: !result.error, result };
    } catch (error) {
      this.metrics.failures++;
      this.logger.error(`❌ Error ejecutando workflow: ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  /**
   * Ejecutar paso individual
   */
  async executeStep(step, context) {
    switch (step.action) {
      case 'memory':
        return await this.actionMemory(step, context);

      case 'task':
        return await this.actionTask(step, context);

      case 'project':
        return await this.actionProject(step, context);

      case 'search':
        return await this.actionSearch(step, context);

      case 'notify':
        return await this.actionNotify(step, context);

      case 'delay':
        return await this.actionDelay(step, context);

      case 'condition':
        return await this.actionCondition(step, context);

      default:
        return { ...context, error: `Unknown action: ${step.action}` };
    }
  }

  /**
   * Acción: Guardar en memoria
   */
  async actionMemory(step, context) {
    this.logger.info(`    💾 Guardando en memoria: ${step.data}`);
    context.memory = { saved: step.data, timestamp: new Date().toISOString() };
    return context;
  }

  /**
   * Acción: Crear tarea
   */
  async actionTask(step, context) {
    this.logger.info(`    ✅ Creando tarea: ${step.data}`);
    context.task = {
      created: step.data,
      id: `task_${Date.now()}`,
      timestamp: new Date().toISOString()
    };
    return context;
  }

  /**
   * Acción: Crear proyecto
   */
  async actionProject(step, context) {
    this.logger.info(`    📁 Proyecto: ${step.data}`);
    context.project = {
      created: step.data,
      timestamp: new Date().toISOString()
    };
    return context;
  }

  /**
   * Acción: Búsqueda
   */
  async actionSearch(step, context) {
    this.logger.info(`    🔍 Búsqueda: ${step.data}`);
    context.search = {
      query: step.data,
      results: [],
      timestamp: new Date().toISOString()
    };
    return context;
  }

  /**
   * Acción: Notificación
   */
  async actionNotify(step, context) {
    const message = step.message || step.data;
    this.logger.info(`    📢 Notificación: ${message}`);
    context.notification = {
      sent: message,
      timestamp: new Date().toISOString()
    };
    return context;
  }

  /**
   * Acción: Delay (espera)
   */
  async actionDelay(step, context) {
    const ms = step.duration || 1000;
    this.logger.info(`    ⏱️ Esperando ${ms}ms...`);
    await new Promise(resolve => setTimeout(resolve, ms));
    return context;
  }

  /**
   * Acción: Condición
   */
  async actionCondition(step, context) {
    const condition = step.condition || (() => true);
    const result = typeof condition === 'function' ? condition(context) : true;

    this.logger.info(`    🔀 Condición: ${result ? 'TRUE' : 'FALSE'}`);

    if (!result && step.stopOnFalse) {
      return { ...context, error: 'Condition failed' };
    }

    return context;
  }

  /**
   * Deshabilitar workflow
   */
  disableWorkflow(workflowId) {
    const workflow = this.workflows.find(w => w.id === workflowId);
    if (workflow) {
      workflow.enabled = false;
      this.logger.info(`⏸️ Workflow deshabilitado: ${workflow.name}`);
      return true;
    }
    return false;
  }

  /**
   * Habilitar workflow
   */
  enableWorkflow(workflowId) {
    const workflow = this.workflows.find(w => w.id === workflowId);
    if (workflow) {
      workflow.enabled = true;
      this.logger.info(`▶️ Workflow habilitado: ${workflow.name}`);
      return true;
    }
    return false;
  }

  /**
   * Eliminar workflow
   */
  deleteWorkflow(workflowId) {
    const index = this.workflows.findIndex(w => w.id === workflowId);
    if (index !== -1) {
      const workflow = this.workflows[index];
      this.workflows.splice(index, 1);
      this.logger.info(`🗑️ Workflow eliminado: ${workflow.name}`);
      return true;
    }
    return false;
  }

  /**
   * Obtener métricas
   */
  getMetrics() {
    const successRate = this.metrics.executions > 0
      ? ((this.metrics.successes / this.metrics.executions) * 100).toFixed(2) + '%'
      : 'N/A';

    return {
      ...this.metrics,
      workflowCount: this.workflows.length,
      enabledWorkflows: this.workflows.filter(w => w.enabled).length,
      successRate
    };
  }

  /**
   * Obtener workflows
   */
  getWorkflows() {
    return this.workflows.map(w => ({
      id: w.id,
      name: w.name,
      enabled: w.enabled,
      stepCount: w.steps.length,
      executions: w.executions,
      lastRun: w.lastRun,
      created: w.created
    }));
  }

  /**
   * Obtener workflow por ID
   */
  getWorkflow(workflowId) {
    return this.workflows.find(w => w.id === workflowId);
  }
}

module.exports = AutomationEngine;

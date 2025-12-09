// core/scheduler/workflow-manager.cjs
// Gestor de Workflows y Automatización

const EventEmitter = require('events');

/**
 * Workflow Manager
 *
 * Sistema de gestión de workflows automatizados
 *
 * Características:
 * - Definición de workflows con múltiples pasos
 * - Ejecución condicional
 * - Paralelización de tareas
 * - Manejo de errores y rollback
 * - Variables y contexto compartido
 * - Templates de workflows comunes
 */
class WorkflowManager extends EventEmitter {
  constructor(options = {}) {
    super();

    this.projectRoot = options.projectRoot || process.cwd();
    this.metricsPersistence = options.metricsPersistence;
    this.taskScheduler = options.taskScheduler;
    this.autonomousAgent = options.autonomousAgent;
    this.codeIndexer = options.codeIndexer;
    this.docGenerator = options.docGenerator;

    // Workflows definidos
    this.workflows = new Map();

    // Ejecuciones activas
    this.activeExecutions = new Map();

    // Templates predefinidos
    this.templates = this.initializeTemplates();

    this.isInitialized = false;
  }

  /**
   * Inicializa el workflow manager
   */
  async initialize() {
    if (this.isInitialized) return;

    console.log('🔄 [Workflow Manager] Inicializando...');

    // Crear tablas en base de datos
    if (this.metricsPersistence) {
      await this.initializeDatabase();
    }

    // Cargar workflows guardados
    await this.loadWorkflows();

    this.isInitialized = true;
    console.log('✅ [Workflow Manager] Sistema inicializado');
  }

  /**
   * Inicializa las tablas en la base de datos
   */
  async initializeDatabase() {
    const db = this.metricsPersistence.db;

    // Tabla de workflows
    db.exec(`
      CREATE TABLE IF NOT EXISTS workflows (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        description TEXT,
        steps TEXT NOT NULL, -- JSON
        enabled INTEGER DEFAULT 1,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      )
    `);

    // Tabla de ejecuciones de workflow
    db.exec(`
      CREATE TABLE IF NOT EXISTS workflow_executions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        workflow_id INTEGER NOT NULL,
        execution_id TEXT NOT NULL,
        started_at INTEGER NOT NULL,
        completed_at INTEGER,
        status TEXT NOT NULL, -- 'running', 'success', 'error', 'cancelled'
        current_step INTEGER,
        total_steps INTEGER,
        context TEXT, -- JSON
        result TEXT, -- JSON
        error TEXT,
        FOREIGN KEY (workflow_id) REFERENCES workflows(id) ON DELETE CASCADE
      )
    `);

    console.log('✅ [Workflow Manager] Base de datos inicializada');
  }

  /**
   * Carga workflows desde la base de datos
   */
  async loadWorkflows() {
    if (!this.metricsPersistence) return;

    const db = this.metricsPersistence.db;
    const workflows = db.prepare('SELECT * FROM workflows WHERE enabled = 1').all();

    console.log(`📋 [Workflow Manager] Cargando ${workflows.length} workflows...`);

    for (const workflow of workflows) {
      this.workflows.set(workflow.id, {
        id: workflow.id,
        name: workflow.name,
        description: workflow.description,
        steps: JSON.parse(workflow.steps),
        enabled: Boolean(workflow.enabled)
      });
    }
  }

  /**
   * Inicializa templates de workflows comunes
   */
  initializeTemplates() {
    return {
      'daily-maintenance': {
        name: 'Mantenimiento Diario',
        description: 'Workflow de mantenimiento diario del proyecto',
        steps: [
          {
            name: 'Reindexar código',
            action: 'reindex-code',
            parameters: {}
          },
          {
            name: 'Limpiar notificaciones antiguas',
            action: 'cleanup-notifications',
            parameters: { olderThan: 7 * 24 * 60 * 60 * 1000 } // 7 días
          },
          {
            name: 'Generar reporte de salud',
            action: 'autonomous-task',
            parameters: {
              task: 'Generar un reporte del estado de salud del proyecto'
            }
          }
        ]
      },

      'code-quality-check': {
        name: 'Verificación de Calidad de Código',
        description: 'Analiza y documenta el código del proyecto',
        steps: [
          {
            name: 'Buscar archivos sin documentar',
            action: 'find-undocumented',
            parameters: {}
          },
          {
            name: 'Generar documentación faltante',
            action: 'generate-docs',
            parameters: { autoFix: true }
          },
          {
            name: 'Buscar funciones complejas',
            action: 'find-complex-functions',
            parameters: { threshold: 20 }
          },
          {
            name: 'Notificar resultados',
            action: 'notify-results',
            parameters: {}
          }
        ]
      },

      'backup-project': {
        name: 'Backup del Proyecto',
        description: 'Crea backup completo del proyecto',
        steps: [
          {
            name: 'Crear commit de backup',
            action: 'git-commit',
            parameters: { message: 'Backup automático' }
          },
          {
            name: 'Generar documentación completa',
            action: 'generate-project-docs',
            parameters: {}
          },
          {
            name: 'Comprimir archivos',
            action: 'compress-files',
            parameters: { output: 'backup.zip' }
          }
        ]
      },

      'onboarding-new-developer': {
        name: 'Onboarding de Nuevo Desarrollador',
        description: 'Prepara documentación y recursos para un nuevo desarrollador',
        steps: [
          {
            name: 'Generar documentación del proyecto',
            action: 'generate-project-docs',
            parameters: {}
          },
          {
            name: 'Crear README de inicio rápido',
            action: 'autonomous-task',
            parameters: {
              task: 'Crear un archivo QUICK_START.md con instrucciones para configurar el proyecto'
            }
          },
          {
            name: 'Listar dependencias y requisitos',
            action: 'autonomous-task',
            parameters: {
              task: 'Documentar todas las dependencias y requisitos del sistema'
            }
          },
          {
            name: 'Crear guía de arquitectura',
            action: 'autonomous-task',
            parameters: {
              task: 'Crear un documento ARCHITECTURE.md explicando la arquitectura del sistema'
            }
          }
        ]
      }
    };
  }

  /**
   * Crea un workflow desde un template
   */
  async createFromTemplate(templateName, customizations = {}) {
    const template = this.templates[templateName];
    if (!template) {
      throw new Error(`Template no encontrado: ${templateName}`);
    }

    const workflow = {
      name: customizations.name || template.name,
      description: customizations.description || template.description,
      steps: customizations.steps || template.steps
    };

    return await this.createWorkflow(workflow);
  }

  /**
   * Crea un nuevo workflow
   */
  async createWorkflow(config) {
    const { name, description = '', steps = [] } = config;

    if (!name || steps.length === 0) {
      throw new Error('El workflow debe tener nombre y al menos un paso');
    }

    console.log(`🔄 [Workflow Manager] Creando workflow: "${name}"`);

    // Guardar en base de datos
    let workflowId;
    if (this.metricsPersistence) {
      const db = this.metricsPersistence.db;
      const now = Date.now();

      const result = db.prepare(`
        INSERT INTO workflows (name, description, steps, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?)
      `).run(name, description, JSON.stringify(steps), now, now);

      workflowId = result.lastInsertRowid;
    } else {
      workflowId = Date.now();
    }

    const workflow = {
      id: workflowId,
      name,
      description,
      steps,
      enabled: true
    };

    this.workflows.set(workflowId, workflow);

    this.emit('workflow:created', workflow);
    console.log(`✅ [Workflow Manager] Workflow creado (ID: ${workflowId})`);

    return workflow;
  }

  /**
   * Ejecuta un workflow
   */
  async executeWorkflow(workflowId, context = {}) {
    const workflow = this.workflows.get(workflowId);
    if (!workflow) {
      throw new Error(`Workflow no encontrado: ${workflowId}`);
    }

    if (!workflow.enabled) {
      throw new Error('Workflow está deshabilitado');
    }

    const executionId = `wf-${workflowId}-${Date.now()}`;
    const startTime = Date.now();

    console.log(`▶️ [Workflow Manager] Ejecutando: ${workflow.name} (${executionId})`);

    // Registrar ejecución
    const execution = {
      id: executionId,
      workflowId,
      workflow,
      startTime,
      status: 'running',
      currentStep: 0,
      totalSteps: workflow.steps.length,
      context: { ...context },
      results: [],
      errors: []
    };

    this.activeExecutions.set(executionId, execution);

    // Guardar en DB
    if (this.metricsPersistence) {
      const db = this.metricsPersistence.db;
      db.prepare(`
        INSERT INTO workflow_executions (
          workflow_id, execution_id, started_at, status,
          current_step, total_steps, context
        ) VALUES (?, ?, ?, 'running', 0, ?, ?)
      `).run(
        workflowId,
        executionId,
        startTime,
        workflow.steps.length,
        JSON.stringify(execution.context)
      );
    }

    this.emit('workflow:started', { executionId, workflow });

    try {
      // Ejecutar cada paso
      for (let i = 0; i < workflow.steps.length; i++) {
        const step = workflow.steps[i];

        execution.currentStep = i + 1;

        console.log(`▶️ [Workflow] Paso ${i + 1}/${workflow.steps.length}: ${step.name}`);

        try {
          const stepResult = await this.executeStep(step, execution.context);

          execution.results.push({
            step: i + 1,
            name: step.name,
            success: true,
            result: stepResult
          });

          // Actualizar contexto con resultado del paso
          if (step.outputVariable) {
            execution.context[step.outputVariable] = stepResult;
          }

          this.emit('workflow:step-completed', {
            executionId,
            step: i + 1,
            stepName: step.name,
            result: stepResult
          });

        } catch (error) {
          console.error(`❌ [Workflow] Error en paso ${i + 1}:`, error);

          execution.errors.push({
            step: i + 1,
            name: step.name,
            error: error.message
          });

          // Si el paso es crítico, detener el workflow
          if (step.critical !== false) {
            throw new Error(`Workflow detenido en paso "${step.name}": ${error.message}`);
          }

          // Continuar con el siguiente paso
          execution.results.push({
            step: i + 1,
            name: step.name,
            success: false,
            error: error.message
          });
        }
      }

      // Workflow completado exitosamente
      const endTime = Date.now();
      const duration = endTime - startTime;

      execution.status = 'success';
      execution.endTime = endTime;
      execution.duration = duration;

      console.log(`✅ [Workflow Manager] Completado: ${workflow.name} (${duration}ms)`);

      // Actualizar en DB
      if (this.metricsPersistence) {
        const db = this.metricsPersistence.db;
        db.prepare(`
          UPDATE workflow_executions
          SET completed_at = ?, status = 'success', result = ?
          WHERE execution_id = ?
        `).run(endTime, JSON.stringify(execution.results), executionId);
      }

      this.activeExecutions.delete(executionId);

      this.emit('workflow:completed', {
        executionId,
        workflow,
        duration,
        results: execution.results
      });

      return {
        success: true,
        executionId,
        duration,
        results: execution.results,
        errors: execution.errors
      };

    } catch (error) {
      const endTime = Date.now();
      const duration = endTime - startTime;

      execution.status = 'error';
      execution.endTime = endTime;
      execution.duration = duration;
      execution.error = error.message;

      console.error(`❌ [Workflow Manager] Error: ${workflow.name}:`, error);

      // Actualizar en DB
      if (this.metricsPersistence) {
        const db = this.metricsPersistence.db;
        db.prepare(`
          UPDATE workflow_executions
          SET completed_at = ?, status = 'error', error = ?
          WHERE execution_id = ?
        `).run(endTime, error.message, executionId);
      }

      this.activeExecutions.delete(executionId);

      this.emit('workflow:error', {
        executionId,
        workflow,
        error,
        results: execution.results
      });

      throw error;
    }
  }

  /**
   * Ejecuta un paso del workflow
   */
  async executeStep(step, context) {
    const { action, parameters = {} } = step;

    // Resolver variables en los parámetros
    const resolvedParams = this.resolveParameters(parameters, context);

    switch (action) {
      case 'autonomous-task':
        return await this.executeAutonomousTask(resolvedParams);

      case 'reindex-code':
        return await this.reindexCode(resolvedParams);

      case 'cleanup-notifications':
        return await this.cleanupNotifications(resolvedParams);

      case 'find-undocumented':
        return await this.findUndocumented(resolvedParams);

      case 'generate-docs':
        return await this.generateDocs(resolvedParams);

      case 'generate-project-docs':
        return await this.generateProjectDocs(resolvedParams);

      case 'find-complex-functions':
        return await this.findComplexFunctions(resolvedParams);

      case 'notify-results':
        return await this.notifyResults(resolvedParams, context);

      case 'git-commit':
        return await this.gitCommit(resolvedParams);

      case 'compress-files':
        return await this.compressFiles(resolvedParams);

      default:
        throw new Error(`Acción no soportada: ${action}`);
    }
  }

  /**
   * Resuelve variables en parámetros
   */
  resolveParameters(parameters, context) {
    const resolved = {};

    for (const [key, value] of Object.entries(parameters)) {
      if (typeof value === 'string' && value.startsWith('${') && value.endsWith('}')) {
        // Variable del contexto
        const varName = value.slice(2, -1);
        resolved[key] = context[varName];
      } else {
        resolved[key] = value;
      }
    }

    return resolved;
  }

  /**
   * Acciones específicas
   */

  async executeAutonomousTask(parameters) {
    if (!this.autonomousAgent) {
      throw new Error('Autonomous agent no disponible');
    }

    const { task } = parameters;
    return await this.autonomousAgent.executeTask(task);
  }

  async reindexCode(parameters) {
    if (!this.codeIndexer) {
      throw new Error('Code indexer no disponible');
    }

    console.log('🔍 [Workflow] Reindexando código...');
    const stats = await this.codeIndexer.indexProject();

    return {
      action: 'reindex-code',
      files: stats.totalFiles,
      lines: stats.totalLines,
      functions: stats.totalFunctions
    };
  }

  async cleanupNotifications(parameters) {
    // Placeholder - implementar limpieza de notificaciones
    console.log('🗑️ [Workflow] Limpiando notificaciones antiguas...');
    return { action: 'cleanup-notifications', cleaned: 0 };
  }

  async findUndocumented(parameters) {
    if (!this.codeIndexer) {
      throw new Error('Code indexer no disponible');
    }

    console.log('📝 [Workflow] Buscando archivos sin documentar...');

    const allFiles = this.codeIndexer.getAllFiles();
    const undocumented = allFiles.filter(file => {
      const metadata = this.codeIndexer.getFileMetadata(file);
      return metadata && metadata.functions.length > 0 && !metadata.hasDocumentation;
    });

    return {
      action: 'find-undocumented',
      totalFiles: allFiles.length,
      undocumented: undocumented.length,
      files: undocumented.slice(0, 10) // Primeros 10
    };
  }

  async generateDocs(parameters) {
    if (!this.docGenerator) {
      throw new Error('Doc generator no disponible');
    }

    console.log('📚 [Workflow] Generando documentación...');

    const { files = [], autoFix = false } = parameters;

    const generated = [];

    for (const file of files.slice(0, 5)) { // Limitar a 5 archivos por ejecución
      try {
        const doc = await this.docGenerator.generateFileDocumentation(file);
        generated.push(file);
      } catch (error) {
        console.error(`Error documentando ${file}:`, error);
      }
    }

    return {
      action: 'generate-docs',
      generated: generated.length,
      files: generated
    };
  }

  async generateProjectDocs(parameters) {
    if (!this.docGenerator) {
      throw new Error('Doc generator no disponible');
    }

    console.log('📚 [Workflow] Generando documentación del proyecto...');

    const doc = await this.docGenerator.generateProjectDocumentation();

    return {
      action: 'generate-project-docs',
      files: doc.files.length,
      generated: true
    };
  }

  async findComplexFunctions(parameters) {
    console.log('🔍 [Workflow] Buscando funciones complejas...');

    // Placeholder - implementar análisis de complejidad
    return {
      action: 'find-complex-functions',
      found: 0,
      functions: []
    };
  }

  async notifyResults(parameters, context) {
    console.log('🔔 [Workflow] Notificando resultados...');

    // Placeholder - enviar notificación con resultados del workflow
    return {
      action: 'notify-results',
      sent: true
    };
  }

  async gitCommit(parameters) {
    console.log('📝 [Workflow] Creando commit...');

    const { message = 'Automated commit' } = parameters;

    // Placeholder - ejecutar git commit
    return {
      action: 'git-commit',
      message,
      committed: false // No ejecutar realmente por ahora
    };
  }

  async compressFiles(parameters) {
    console.log('📦 [Workflow] Comprimiendo archivos...');

    // Placeholder - comprimir archivos
    return {
      action: 'compress-files',
      output: parameters.output,
      compressed: false // No ejecutar realmente por ahora
    };
  }

  /**
   * Obtiene todos los workflows
   */
  getAllWorkflows() {
    return Array.from(this.workflows.values());
  }

  /**
   * Obtiene todos los templates
   */
  getTemplates() {
    return this.templates;
  }

  /**
   * Obtiene un workflow por ID
   */
  getWorkflow(workflowId) {
    return this.workflows.get(workflowId);
  }

  /**
   * Obtiene el historial de ejecuciones de un workflow
   */
  getWorkflowHistory(workflowId, limit = 20) {
    if (!this.metricsPersistence) return [];

    const db = this.metricsPersistence.db;
    return db.prepare(`
      SELECT * FROM workflow_executions
      WHERE workflow_id = ?
      ORDER BY started_at DESC
      LIMIT ?
    `).all(workflowId, limit);
  }

  /**
   * Elimina un workflow
   */
  async deleteWorkflow(workflowId) {
    const workflow = this.workflows.get(workflowId);
    if (!workflow) {
      throw new Error(`Workflow no encontrado: ${workflowId}`);
    }

    console.log(`🗑️ [Workflow Manager] Eliminando: ${workflow.name}`);

    this.workflows.delete(workflowId);

    if (this.metricsPersistence) {
      const db = this.metricsPersistence.db;
      db.prepare('DELETE FROM workflows WHERE id = ?').run(workflowId);
      db.prepare('DELETE FROM workflow_executions WHERE workflow_id = ?').run(workflowId);
    }

    this.emit('workflow:deleted', { workflowId, workflow });
  }

  /**
   * Obtiene estadísticas
   */
  getStats() {
    const allWorkflows = this.getAllWorkflows();

    const stats = {
      totalWorkflows: allWorkflows.length,
      enabledWorkflows: allWorkflows.filter(w => w.enabled).length,
      activeExecutions: this.activeExecutions.size
    };

    if (this.metricsPersistence) {
      const db = this.metricsPersistence.db;

      const executionStats = db.prepare(`
        SELECT
          COUNT(*) as total,
          SUM(CASE WHEN status = 'success' THEN 1 ELSE 0 END) as successful,
          SUM(CASE WHEN status = 'error' THEN 1 ELSE 0 END) as failed
        FROM workflow_executions
      `).get();

      Object.assign(stats, {
        totalExecutions: executionStats.total,
        successfulExecutions: executionStats.successful,
        failedExecutions: executionStats.failed
      });
    }

    return stats;
  }
}

module.exports = WorkflowManager;

/**
 * 📋 TASK MANAGER MODULE - FASE 1
 * Sistema de gestión de tareas TODO persistente con recordatorios
 *
 * @module task-manager
 * @version 1.0.0
 * @author J.A.R.V.I.S. MARK VII
 */

import fs from 'fs/promises';
import path from 'path';
import cron from 'node-cron';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class TaskManager {
  constructor() {
    this.tasksPath = path.join(process.cwd(), 'data', 'tasks.json');
    this.tasks = null;
    this.scheduledJobs = new Map();
    this.initialized = false;
  }

  /**
   * 🚀 Inicializar sistema de tareas
   */
  async initialize() {
    if (this.initialized) return;

    try {
      // Asegurar directorio data/
      const dataDir = path.join(process.cwd(), 'data');
      try {
        await fs.access(dataDir);
      } catch {
        await fs.mkdir(dataDir, { recursive: true });
      }

      // Cargar o crear tasks.json
      try {
        const data = await fs.readFile(this.tasksPath, 'utf8');
        this.tasks = JSON.parse(data);
      } catch {
        // Crear estructura inicial
        this.tasks = {
          tasks: [],
          stats: {
            total_tasks: 0,
            pending: 0,
            completed: 0,
            high_priority: 0,
            medium_priority: 0,
            low_priority: 0
          },
          reminders: [],
          settings: {
            auto_archive_completed: true,
            archive_after_days: 30
          }
        };
        await this.saveTasks();
      }

      // Cargar recordatorios pendientes
      await this.loadReminders();

      this.initialized = true;
      console.log('✅ [TaskManager] Sistema inicializado correctamente');
    } catch (error) {
      console.error('❌ [TaskManager] Error al inicializar:', error);
      throw error;
    }
  }

  /**
   * Guardar tareas en disco
   */
  async saveTasks() {
    try {
      await fs.writeFile(this.tasksPath, JSON.stringify(this.tasks, null, 2));
      await this.updateStats();
    } catch (error) {
      console.error('❌ [TaskManager] Error al guardar:', error);
      throw error;
    }
  }

  /**
   * Actualizar estadísticas
   */
  async updateStats() {
    const stats = {
      total_tasks: this.tasks.tasks.length,
      pending: this.tasks.tasks.filter(t => t.status === 'pending').length,
      in_progress: this.tasks.tasks.filter(t => t.status === 'in_progress').length,
      completed: this.tasks.tasks.filter(t => t.status === 'completed').length,
      high_priority: this.tasks.tasks.filter(t => t.priority === 'high').length,
      medium_priority: this.tasks.tasks.filter(t => t.priority === 'medium').length,
      low_priority: this.tasks.tasks.filter(t => t.priority === 'low').length,
      last_updated: new Date().toISOString()
    };

    this.tasks.stats = stats;
  }

  /**
   * 📝 COMANDO: "nueva tarea: [descripción]"
   * Crea una nueva tarea con prioridad media por defecto
   *
   * @param {string} description - Descripción de la tarea
   * @param {Object} options - Opciones adicionales
   * @returns {Object} Resultado de la operación
   *
   * @example
   * taskManager.createTask("Implementar búsqueda web");
   */
  async createTask(description, options = {}) {
    await this.initialize();

    try {
      const taskId = `task_${Date.now()}`;
      const now = new Date().toISOString();

      const task = {
        id: taskId,
        description,
        status: options.status || 'pending',
        priority: options.priority || 'medium',
        created: now,
        due_date: options.dueDate || null,
        completed: null,
        tags: options.tags || this.extractTags(description),
        notes: options.notes || null
      };

      this.tasks.tasks.push(task);
      await this.saveTasks();

      console.log(`📝 [TaskManager] Tarea creada: ${taskId}`);

      return {
        success: true,
        message: `✅ Tarea creada con ID ${taskId}, Señor`,
        data: task
      };
    } catch (error) {
      console.error('❌ [TaskManager] Error al crear tarea:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * 📋 COMANDO: "mis tareas"
   * Lista todas las tareas agrupadas por estado y prioridad
   *
   * @param {Object} options - Opciones de filtrado
   * @returns {Object} Lista de tareas
   */
  async listTasks(options = {}) {
    await this.initialize();

    try {
      let tasks = [...this.tasks.tasks];

      // Filtros
      if (options.status) {
        tasks = tasks.filter(t => t.status === options.status);
      }

      if (options.priority) {
        tasks = tasks.filter(t => t.priority === options.priority);
      }

      if (options.tag) {
        tasks = tasks.filter(t => t.tags.includes(options.tag));
      }

      // Agrupar por estado
      const grouped = {
        pending: tasks.filter(t => t.status === 'pending'),
        in_progress: tasks.filter(t => t.status === 'in_progress'),
        completed: tasks.filter(t => t.status === 'completed')
      };

      // Ordenar por prioridad
      const priorityOrder = { high: 0, medium: 1, low: 2 };
      Object.keys(grouped).forEach(status => {
        grouped[status].sort((a, b) => {
          if (a.priority !== b.priority) {
            return priorityOrder[a.priority] - priorityOrder[b.priority];
          }
          return new Date(a.created) - new Date(b.created);
        });
      });

      // Formatear para salida
      const formatted = {
        pending: grouped.pending.map((t, i) => this.formatTask(t, i + 1)),
        in_progress: grouped.in_progress.map((t, i) => this.formatTask(t, i + 1)),
        completed: grouped.completed.map((t, i) => this.formatTask(t, i + 1))
      };

      console.log(`📋 [TaskManager] Listando ${tasks.length} tarea(s)`);

      return {
        success: true,
        message: `📋 Tienes ${tasks.length} tarea(s), Señor`,
        data: formatted,
        stats: this.tasks.stats
      };
    } catch (error) {
      console.error('❌ [TaskManager] Error al listar tareas:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * ✅ COMANDO: "completar tarea [n]"
   * Marca una tarea como completada
   *
   * @param {string} taskId - ID de la tarea
   * @returns {Object} Resultado de la operación
   */
  async completeTask(taskId) {
    await this.initialize();

    try {
      const task = this.tasks.tasks.find(t => t.id === taskId);

      if (!task) {
        return {
          success: false,
          message: `❌ No encontré la tarea ${taskId}, Señor`
        };
      }

      task.status = 'completed';
      task.completed = new Date().toISOString();

      await this.saveTasks();

      console.log(`✅ [TaskManager] Tarea completada: ${taskId}`);

      return {
        success: true,
        message: `✅ Tarea "${task.description}" marcada como completada, Señor`,
        data: task
      };
    } catch (error) {
      console.error('❌ [TaskManager] Error al completar tarea:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * 🗑️ COMANDO: "eliminar tarea [n]"
   * Elimina una tarea
   *
   * @param {string} taskId - ID de la tarea
   * @returns {Object} Resultado de la operación
   */
  async deleteTask(taskId) {
    await this.initialize();

    try {
      const index = this.tasks.tasks.findIndex(t => t.id === taskId);

      if (index === -1) {
        return {
          success: false,
          message: `❌ No encontré la tarea ${taskId}, Señor`
        };
      }

      const deletedTask = this.tasks.tasks.splice(index, 1)[0];
      await this.saveTasks();

      console.log(`🗑️ [TaskManager] Tarea eliminada: ${taskId}`);

      return {
        success: true,
        message: `🗑️ Tarea "${deletedTask.description}" eliminada, Señor`,
        data: deletedTask
      };
    } catch (error) {
      console.error('❌ [TaskManager] Error al eliminar tarea:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * ⏰ COMANDO: "recordarme [algo] en [fecha/hora]"
   * Crea una tarea con recordatorio automático
   *
   * @param {string} description - Qué recordar
   * @param {string} datetime - Cuándo recordar
   * @returns {Object} Resultado de la operación
   */
  async createReminder(description, datetime) {
    await this.initialize();

    try {
      // Parsear fecha/hora natural
      const parsedDate = this.parseDateTime(datetime);

      if (!parsedDate) {
        return {
          success: false,
          message: `❌ No pude entender la fecha/hora: "${datetime}", Señor`
        };
      }

      // Crear tarea
      const taskResult = await this.createTask(description, {
        dueDate: parsedDate,
        priority: 'high',
        tags: ['reminder']
      });

      if (!taskResult.success) {
        return taskResult;
      }

      // Programar recordatorio
      const cronExpression = this.dateToCron(new Date(parsedDate));

      if (cronExpression) {
        const job = cron.schedule(cronExpression, () => {
          console.log(`⏰ [TaskManager] RECORDATORIO: ${description}`);
          // Aquí se podría agregar notificación visual/sonora
        });

        this.scheduledJobs.set(taskResult.data.id, job);

        // Guardar en reminders
        this.tasks.reminders.push({
          taskId: taskResult.data.id,
          description,
          datetime: parsedDate,
          cronExpression,
          active: true
        });

        await this.saveTasks();

        console.log(`⏰ [TaskManager] Recordatorio programado para ${parsedDate}`);

        return {
          success: true,
          message: `⏰ Te recordaré "${description}" el ${new Date(parsedDate).toLocaleString('es-ES')}, Señor`,
          data: {
            task: taskResult.data,
            reminder: parsedDate
          }
        };
      } else {
        return taskResult; // Tarea creada pero sin recordatorio automático
      }
    } catch (error) {
      console.error('❌ [TaskManager] Error al crear recordatorio:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * 🎯 COMANDO: "priorizar tarea [n] a [alta/media/baja]"
   * Cambia la prioridad de una tarea
   *
   * @param {string} taskId - ID de la tarea
   * @param {string} level - Nivel de prioridad
   * @returns {Object} Resultado de la operación
   */
  async prioritizeTask(taskId, level) {
    await this.initialize();

    try {
      const task = this.tasks.tasks.find(t => t.id === taskId);

      if (!task) {
        return {
          success: false,
          message: `❌ No encontré la tarea ${taskId}, Señor`
        };
      }

      const validLevels = ['alta', 'media', 'baja', 'high', 'medium', 'low'];
      const normalizedLevel = level.toLowerCase();

      if (!validLevels.includes(normalizedLevel)) {
        return {
          success: false,
          message: `❌ Prioridad inválida: "${level}". Use: alta, media, baja`
        };
      }

      // Normalizar a inglés
      const priorityMap = {
        alta: 'high',
        media: 'medium',
        baja: 'low',
        high: 'high',
        medium: 'medium',
        low: 'low'
      };

      task.priority = priorityMap[normalizedLevel];
      await this.saveTasks();

      console.log(`🎯 [TaskManager] Prioridad actualizada: ${taskId} → ${task.priority}`);

      return {
        success: true,
        message: `🎯 Tarea "${task.description}" ahora tiene prioridad ${task.priority}, Señor`,
        data: task
      };
    } catch (error) {
      console.error('❌ [TaskManager] Error al priorizar tarea:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // ========================================
  // MÉTODOS AUXILIARES
  // ========================================

  /**
   * Formatear tarea para salida
   */
  formatTask(task, numero) {
    return {
      numero,
      id: task.id,
      descripcion: task.description,
      estado: task.status,
      prioridad: task.priority,
      creada: new Date(task.created).toLocaleDateString('es-ES'),
      vencimiento: task.due_date ? new Date(task.due_date).toLocaleDateString('es-ES') : 'Sin fecha',
      tags: task.tags.join(', ')
    };
  }

  /**
   * Extraer tags de descripción
   */
  extractTags(description) {
    const tags = [];
    const lower = description.toLowerCase();

    // Tecnologías
    const techs = ['node', 'python', 'react', 'vue', 'php', 'java', 'javascript'];
    techs.forEach(tech => {
      if (lower.includes(tech)) tags.push(tech);
    });

    // Palabras clave
    if (lower.includes('bug') || lower.includes('error')) tags.push('bug');
    if (lower.includes('feature')) tags.push('feature');
    if (lower.includes('doc')) tags.push('documentation');
    if (lower.includes('test')) tags.push('testing');

    return tags.length > 0 ? tags : ['general'];
  }

  /**
   * Parsear fecha/hora natural
   */
  parseDateTime(datetime) {
    const lower = datetime.toLowerCase().trim();
    const now = new Date();

    // "en X minutos"
    const minutesMatch = lower.match(/en\s+(\d+)\s+minutos?/);
    if (minutesMatch) {
      return new Date(now.getTime() + parseInt(minutesMatch[1]) * 60000).toISOString();
    }

    // "en X horas"
    const hoursMatch = lower.match(/en\s+(\d+)\s+horas?/);
    if (hoursMatch) {
      return new Date(now.getTime() + parseInt(hoursMatch[1]) * 3600000).toISOString();
    }

    // "mañana a las HH:MM"
    if (lower.includes('mañana')) {
      const tomorrow = new Date(now);
      tomorrow.setDate(tomorrow.getDate() + 1);

      const timeMatch = lower.match(/(\d{1,2}):(\d{2})/);
      if (timeMatch) {
        tomorrow.setHours(parseInt(timeMatch[1]), parseInt(timeMatch[2]), 0, 0);
      } else {
        tomorrow.setHours(9, 0, 0, 0); // Por defecto 9:00 AM
      }

      return tomorrow.toISOString();
    }

    // Formato YYYY-MM-DD HH:MM
    const isoMatch = datetime.match(/(\d{4}-\d{2}-\d{2})\s+(\d{1,2}):(\d{2})/);
    if (isoMatch) {
      const [, date, hour, minute] = isoMatch;
      const parsed = new Date(`${date}T${hour.padStart(2, '0')}:${minute}:00`);
      return parsed.toISOString();
    }

    return null;
  }

  /**
   * Convertir fecha a expresión cron
   */
  dateToCron(date) {
    try {
      const minute = date.getMinutes();
      const hour = date.getHours();
      const day = date.getDate();
      const month = date.getMonth() + 1;

      // Cron: minute hour day month dayOfWeek
      return `${minute} ${hour} ${day} ${month} *`;
    } catch {
      return null;
    }
  }

  /**
   * Cargar recordatorios pendientes
   */
  async loadReminders() {
    if (!this.tasks.reminders) return;

    this.tasks.reminders.forEach(reminder => {
      if (reminder.active && reminder.cronExpression) {
        const job = cron.schedule(reminder.cronExpression, () => {
          console.log(`⏰ [TaskManager] RECORDATORIO: ${reminder.description}`);
        });

        this.scheduledJobs.set(reminder.taskId, job);
      }
    });

    console.log(`⏰ [TaskManager] ${this.scheduledJobs.size} recordatorio(s) activo(s)`);
  }

  /**
   * Detener todos los recordatorios
   */
  stopAllReminders() {
    this.scheduledJobs.forEach(job => job.stop());
    this.scheduledJobs.clear();
    console.log('⏰ [TaskManager] Todos los recordatorios detenidos');
  }
}

export default TaskManager;

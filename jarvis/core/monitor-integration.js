// core/monitor-integration.js
// J.A.R.V.I.S. Autonomous Monitor & Scheduler
// Sistema proactivo de monitoreo y tareas programadas

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

class MonitorIntegration {
  constructor(jarvis) {
    this.jarvis = jarvis;
    this.git = null;
    this.memory = null;
    this.timers = {
      fast: null,    // 5 minutos
      hourly: null,  // 1 hora
      daily: null    // Diario 3 AM
    };
    this.lastChecks = {
      fileChanges: null,
      gitStatus: null,
      logErrors: null,
      dbAnalysis: null
    };
    this.alerts = [];
    this.running = false;
  }

  /**
   * Inicializa el monitor
   */
  async initialize(gitIntegration, memoryAdvanced) {
    console.log('🔧 [Monitor] Inicializando sistema de monitoreo autónomo...');

    this.git = gitIntegration;
    this.memory = memoryAdvanced;

    // Cargar configuración
    this.config = {
      fastInterval: 5 * 60 * 1000,        // 5 minutos
      hourlyInterval: 60 * 60 * 1000,     // 1 hora
      dailyTime: { hour: 3, minute: 0 },  // 3:00 AM
      maxAlertsPerHour: 10,
      autoCommitThreshold: 10,  // Auto-commit después de 10 archivos modificados
      logDirectory: path.join(process.cwd(), 'logs'),
      backupDirectory: path.join(process.cwd(), 'backups')
    };

    // Asegurar que existen directorios necesarios
    await this.ensureDirectories();

    console.log('✅ [Monitor] Monitor inicializado correctamente');
    return true;
  }

  /**
   * Inicia el monitor autónomo
   */
  start() {
    if (this.running) {
      console.log('⚠️  [Monitor] Monitor ya está corriendo');
      return;
    }

    console.log('🚀 [Monitor] Iniciando tareas programadas...');
    this.running = true;

    // Tareas rápidas (cada 5 minutos)
    this.timers.fast = setInterval(() => {
      this.runFastTasks().catch(err => {
        console.error('❌ [Monitor] Error en tareas rápidas:', err.message);
      });
    }, this.config.fastInterval);

    // Tareas horarias (cada 1 hora)
    this.timers.hourly = setInterval(() => {
      this.runHourlyTasks().catch(err => {
        console.error('❌ [Monitor] Error en tareas horarias:', err.message);
      });
    }, this.config.hourlyInterval);

    // Tareas diarias (scheduler para 3 AM)
    this.scheduleDailyTasks();

    console.log('✅ [Monitor] Tareas programadas activas');
    console.log(`   ⏱️  Rápidas: cada 5 minutos`);
    console.log(`   🕐 Horarias: cada 1 hora`);
    console.log(`   📅 Diarias: 3:00 AM`);

    // Ejecutar tareas rápidas inmediatamente
    this.runFastTasks().catch(err => {
      console.error('❌ [Monitor] Error en primera ejecución:', err.message);
    });
  }

  /**
   * Detiene el monitor
   */
  stop() {
    if (!this.running) return;

    console.log('🛑 [Monitor] Deteniendo tareas programadas...');

    if (this.timers.fast) clearInterval(this.timers.fast);
    if (this.timers.hourly) clearInterval(this.timers.hourly);
    if (this.timers.daily) clearTimeout(this.timers.daily);

    this.running = false;
    console.log('✅ [Monitor] Monitor detenido');
  }

  // ═════════════════════════════════════════════════════════════
  // TAREAS RÁPIDAS (cada 5 minutos)
  // ═════════════════════════════════════════════════════════════

  async runFastTasks() {
    console.log('⚡ [Monitor] Ejecutando tareas rápidas...');

    const results = {
      timestamp: new Date(),
      tasks: []
    };

    try {
      // Tarea 1: Detectar cambios en archivos
      const fileChanges = await this.checkFileChanges();
      results.tasks.push({ name: 'fileChanges', ...fileChanges });

      if (fileChanges.hasChanges) {
        this.createAlert('info', `Detectados ${fileChanges.totalChanges} archivos modificados`, fileChanges);
      }

      // Tarea 2: Verificar estado Git
      let gitStatus = null;
      if (this.git && this.git.initialized) {
        gitStatus = await this.checkGitStatus();
        results.tasks.push({ name: 'gitStatus', ...gitStatus });

        if (gitStatus.uncommitted > 0) {
          this.createAlert('warning', `${gitStatus.uncommitted} archivos sin commit`, gitStatus);
        }
      }

      // Tarea 3: Escanear logs en busca de errores
      const logErrors = await this.scanLogsForErrors();
      results.tasks.push({ name: 'logErrors', ...logErrors });

      if (logErrors.errorsFound > 0) {
        this.createAlert('error', `${logErrors.errorsFound} errores encontrados en logs`, logErrors);
      }

      this.lastChecks.fileChanges = fileChanges;
      this.lastChecks.gitStatus = gitStatus;
      this.lastChecks.logErrors = logErrors;

      console.log(`✅ [Monitor] Tareas rápidas completadas: ${results.tasks.length} checks`);
    } catch (error) {
      console.error('❌ [Monitor] Error en tareas rápidas:', error.message);
    }

    return results;
  }

  /**
   * Detecta cambios en archivos del proyecto
   */
  async checkFileChanges() {
    try {
      if (!this.git || !this.git.initialized) {
        return { hasChanges: false, reason: 'Git no inicializado' };
      }

      const status = await this.git.getStatus();

      return {
        hasChanges: status.totalChanges > 0,
        totalChanges: status.totalChanges,
        modified: status.files.modified.length,
        untracked: status.files.untracked.length,
        deleted: status.files.deleted.length,
        staged: status.files.staged.length,
        files: status.files
      };
    } catch (error) {
      return { hasChanges: false, error: error.message };
    }
  }

  /**
   * Verifica estado de Git
   */
  async checkGitStatus() {
    try {
      const status = await this.git.getStatus();

      return {
        clean: status.clean,
        branch: status.branch,
        uncommitted: status.totalChanges,
        unpushed: status.unpushedCommits,
        needsAction: status.totalChanges > 0 || status.unpushedCommits > 0
      };
    } catch (error) {
      return { error: error.message };
    }
  }

  /**
   * Escanea logs en busca de errores
   */
  async scanLogsForErrors() {
    try {
      const logDir = this.config.logDirectory;
      const errors = [];

      // Verificar si existe directorio de logs
      try {
        await fs.access(logDir);
      } catch {
        return { errorsFound: 0, errors: [] };
      }

      // Leer archivos de log recientes
      const files = await fs.readdir(logDir);
      const today = new Date().toISOString().split('T')[0];
      const todayLogs = files.filter(f => f.includes(today));

      for (const file of todayLogs) {
        const content = await fs.readFile(path.join(logDir, file), 'utf-8');
        const lines = content.split('\n');

        // Buscar patrones de error
        const errorPatterns = [/ERROR/i, /CRITICAL/i, /FATAL/i, /Exception/i, /Traceback/i];

        for (let i = 0; i < lines.length; i++) {
          const line = lines[i];
          for (const pattern of errorPatterns) {
            if (pattern.test(line)) {
              errors.push({
                file,
                line: i + 1,
                content: line.substring(0, 200)
              });
            }
          }
        }
      }

      return {
        errorsFound: errors.length,
        errors: errors.slice(0, 10), // Solo primeros 10
        scannedFiles: todayLogs.length
      };
    } catch (error) {
      return { errorsFound: 0, error: error.message };
    }
  }

  // ═════════════════════════════════════════════════════════════
  // TAREAS HORARIAS (cada 1 hora)
  // ═════════════════════════════════════════════════════════════

  async runHourlyTasks() {
    console.log('🕐 [Monitor] Ejecutando tareas horarias...');

    const results = {
      timestamp: new Date(),
      tasks: []
    };

    try {
      // Tarea 1: Análisis de base de datos
      if (this.memory) {
        const dbAnalysis = await this.analyzeDatabase();
        results.tasks.push({ name: 'dbAnalysis', ...dbAnalysis });
      }

      // Tarea 2: Limpieza de logs antiguos
      const logCleanup = await this.cleanupOldLogs();
      results.tasks.push({ name: 'logCleanup', ...logCleanup });

      // Tarea 3: Auto-commit si hay muchos cambios
      if (this.git && this.git.initialized) {
        const autoCommit = await this.considerAutoCommit();
        results.tasks.push({ name: 'autoCommit', ...autoCommit });

        if (autoCommit.committed) {
          this.createAlert('success', 'Auto-commit realizado', autoCommit);
        }
      }

      // Tarea 4: Verificar branches desactualizadas
      if (this.git && this.git.initialized) {
        const branchCheck = await this.git.detectOutdatedBranches();
        results.tasks.push({ name: 'branchCheck', ...branchCheck });

        if (branchCheck.outdated) {
          this.createAlert('warning', `Branch desactualizada por ${branchCheck.behindBy} commits`, branchCheck);
        }
      }

      console.log(`✅ [Monitor] Tareas horarias completadas: ${results.tasks.length} checks`);
    } catch (error) {
      console.error('❌ [Monitor] Error en tareas horarias:', error.message);
    }

    return results;
  }

  /**
   * Analiza la base de datos de memoria
   */
  async analyzeDatabase() {
    try {
      const stats = await this.memory.getMemoryStats();

      return {
        analyzed: true,
        conversations: stats.conversations || 0,
        memories: stats.emotional_memories || 0,
        learnings: stats.learnings || 0,
        size: stats.database_size || 0
      };
    } catch (error) {
      return { analyzed: false, error: error.message };
    }
  }

  /**
   * Limpia logs antiguos (> 7 días)
   */
  async cleanupOldLogs() {
    try {
      const logDir = this.config.logDirectory;
      const files = await fs.readdir(logDir);
      const now = Date.now();
      const maxAge = 7 * 24 * 60 * 60 * 1000; // 7 días
      let deleted = 0;

      for (const file of files) {
        const filePath = path.join(logDir, file);
        const stats = await fs.stat(filePath);

        if (now - stats.mtime.getTime() > maxAge) {
          await fs.unlink(filePath);
          deleted++;
        }
      }

      return { cleaned: true, filesDeleted: deleted };
    } catch (error) {
      return { cleaned: false, error: error.message };
    }
  }

  /**
   * Considera hacer auto-commit si hay muchos cambios
   */
  async considerAutoCommit() {
    try {
      const status = await this.git.getStatus();

      // No hacer commit si ya hay archivos staged (usuario está trabajando)
      if (status.files.staged.length > 0) {
        return {
          committed: false,
          reason: 'Hay archivos staged - esperando commit manual'
        };
      }

      // No hacer commit si hay muy pocos cambios
      if (status.totalChanges < 5) {
        return {
          committed: false,
          reason: 'Muy pocos cambios para auto-commit',
          changes: status.totalChanges
        };
      }

      // Hacer auto-commit si hay >= threshold cambios
      if (status.totalChanges >= this.config.autoCommitThreshold) {
        const result = await this.git.smartAutoCommit({ force: false });
        return result;
      }

      return {
        committed: false,
        reason: 'Umbral de auto-commit no alcanzado',
        changes: status.totalChanges,
        threshold: this.config.autoCommitThreshold
      };
    } catch (error) {
      return { committed: false, error: error.message };
    }
  }

  // ═════════════════════════════════════════════════════════════
  // TAREAS DIARIAS (3:00 AM)
  // ═════════════════════════════════════════════════════════════

  async runDailyTasks() {
    console.log('📅 [Monitor] Ejecutando tareas diarias (3:00 AM)...');

    const results = {
      timestamp: new Date(),
      tasks: []
    };

    try {
      // Tarea 1: Backup de base de datos
      const backup = await this.backupDatabase();
      results.tasks.push({ name: 'backup', ...backup });

      if (backup.success) {
        this.createAlert('success', `Backup creado: ${backup.filename}`, backup);
      }

      // Tarea 2: Reporte de actividad diaria
      const report = await this.generateDailyReport();
      results.tasks.push({ name: 'dailyReport', ...report });

      // Tarea 3: Optimización de base de datos
      if (this.memory) {
        const optimization = await this.optimizeDatabase();
        results.tasks.push({ name: 'optimization', ...optimization });
      }

      // Tarea 4: Commit y push de cambios pendientes
      if (this.git && this.git.initialized) {
        const endOfDayCommit = await this.endOfDayCommit();
        results.tasks.push({ name: 'endOfDayCommit', ...endOfDayCommit });
      }

      console.log(`✅ [Monitor] Tareas diarias completadas: ${results.tasks.length} tasks`);
    } catch (error) {
      console.error('❌ [Monitor] Error en tareas diarias:', error.message);
    }

    // Re-programar para mañana
    this.scheduleDailyTasks();

    return results;
  }

  /**
   * Programa tareas diarias para las 3 AM
   */
  scheduleDailyTasks() {
    const now = new Date();
    const next3AM = new Date();
    next3AM.setHours(this.config.dailyTime.hour, this.config.dailyTime.minute, 0, 0);

    // Si ya pasaron las 3 AM hoy, programar para mañana
    if (now > next3AM) {
      next3AM.setDate(next3AM.getDate() + 1);
    }

    const msUntil3AM = next3AM.getTime() - now.getTime();

    this.timers.daily = setTimeout(() => {
      this.runDailyTasks().catch(err => {
        console.error('❌ [Monitor] Error en tareas diarias:', err.message);
      });
    }, msUntil3AM);

    console.log(`📅 [Monitor] Próximas tareas diarias: ${next3AM.toLocaleString('es-ES')}`);
  }

  /**
   * Backup de base de datos
   */
  async backupDatabase() {
    try {
      const dbPath = path.join(process.cwd(), 'memory', 'jarvis-memory.db');
      const backupDir = this.config.backupDirectory;

      // Crear directorio de backups si no existe
      await fs.mkdir(backupDir, { recursive: true });

      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const backupFilename = `jarvis-memory-${timestamp}.db`;
      const backupPath = path.join(backupDir, backupFilename);

      // Copiar base de datos
      await fs.copyFile(dbPath, backupPath);

      // Obtener tamaño del backup
      const stats = await fs.stat(backupPath);

      return {
        success: true,
        filename: backupFilename,
        size: stats.size,
        path: backupPath
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Genera reporte de actividad diaria
   */
  async generateDailyReport() {
    try {
      const report = {
        date: new Date().toISOString().split('T')[0],
        alerts: this.alerts.length,
        git: null,
        memory: null
      };

      // Estadísticas Git
      if (this.git && this.git.initialized) {
        const commits = await this.git.getLog(10);
        const todayCommits = commits.filter(c => {
          const commitDate = new Date(c.date).toISOString().split('T')[0];
          return commitDate === report.date;
        });

        report.git = {
          commitsToday: todayCommits.length,
          totalCommits: commits.length
        };
      }

      // Estadísticas de memoria
      if (this.memory) {
        const stats = await this.memory.getMemoryStats();
        report.memory = stats;
      }

      // Guardar reporte
      const reportPath = path.join(
        this.config.logDirectory,
        `daily-report-${report.date}.json`
      );

      await fs.writeFile(reportPath, JSON.stringify(report, null, 2));

      return {
        generated: true,
        path: reportPath,
        summary: report
      };
    } catch (error) {
      return {
        generated: false,
        error: error.message
      };
    }
  }

  /**
   * Optimiza la base de datos
   */
  async optimizeDatabase() {
    try {
      // Ejecutar VACUUM en SQLite
      await this.memory.db.run('VACUUM');
      await this.memory.db.run('ANALYZE');

      return {
        optimized: true,
        message: 'Base de datos optimizada exitosamente'
      };
    } catch (error) {
      return {
        optimized: false,
        error: error.message
      };
    }
  }

  /**
   * Commit de fin de día
   */
  async endOfDayCommit() {
    try {
      const status = await this.git.getStatus();

      if (status.totalChanges === 0) {
        return {
          committed: false,
          reason: 'No hay cambios pendientes'
        };
      }

      // Hacer commit con mensaje especial de fin de día
      await this.git.add('.');

      const date = new Date().toISOString().split('T')[0];
      const message = `End of day commit - ${date}\n\nAutomated daily backup`;

      const result = await this.git.commit(message, { addSignature: true });

      // Intentar push
      try {
        await this.git.push();
        result.pushed = true;
      } catch {
        result.pushed = false;
        result.pushError = 'No se pudo hacer push - verificar conectividad';
      }

      return {
        committed: true,
        ...result
      };
    } catch (error) {
      return {
        committed: false,
        error: error.message
      };
    }
  }

  // ═════════════════════════════════════════════════════════════
  // SISTEMA DE ALERTAS
  // ═════════════════════════════════════════════════════════════

  /**
   * Crea una nueva alerta
   */
  createAlert(level, message, context = {}) {
    const alert = {
      id: Date.now(),
      level, // info, warning, error, success
      message,
      context,
      timestamp: new Date(),
      read: false
    };

    this.alerts.push(alert);

    // Mantener solo últimas 100 alertas
    if (this.alerts.length > 100) {
      this.alerts = this.alerts.slice(-100);
    }

    // Log en consola
    const icon = {
      info: 'ℹ️',
      warning: '⚠️',
      error: '❌',
      success: '✅'
    }[level] || 'ℹ️';

    console.log(`${icon} [Monitor Alert] ${message}`);

    return alert;
  }

  /**
   * Obtiene alertas no leídas
   */
  getUnreadAlerts() {
    return this.alerts.filter(a => !a.read);
  }

  /**
   * Marca alerta como leída
   */
  markAlertAsRead(alertId) {
    const alert = this.alerts.find(a => a.id === alertId);
    if (alert) {
      alert.read = true;
    }
  }

  /**
   * Limpia todas las alertas
   */
  clearAlerts() {
    this.alerts = [];
  }

  // ═════════════════════════════════════════════════════════════
  // UTILIDADES
  // ═════════════════════════════════════════════════════════════

  /**
   * Asegura que existen directorios necesarios
   */
  async ensureDirectories() {
    const dirs = [
      this.config.logDirectory,
      this.config.backupDirectory
    ];

    for (const dir of dirs) {
      try {
        await fs.mkdir(dir, { recursive: true });
      } catch (error) {
        console.error(`Error creando directorio ${dir}:`, error.message);
      }
    }
  }

  /**
   * Obtiene estado del monitor
   */
  getStatus() {
    return {
      running: this.running,
      alerts: {
        total: this.alerts.length,
        unread: this.getUnreadAlerts().length
      },
      lastChecks: this.lastChecks,
      nextDaily: this.timers.daily ? 'Programado' : 'No programado'
    };
  }
}

export default MonitorIntegration;

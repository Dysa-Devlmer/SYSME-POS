// core/maintenance-scheduler.cjs
// Sistema de mantenimiento automático y reportes programados para JARVIS

const { EventEmitter } = require('events');
const fs = require('fs');
const path = require('path');

/**
 * Maintenance Scheduler
 *
 * Sistema cron-like para ejecutar tareas de mantenimiento automático:
 * - Limpieza de datos antiguos
 * - Generación de reportes diarios/semanales/mensuales
 * - Backup automático de base de datos
 * - Optimización de DB (VACUUM)
 * - Monitoreo de salud del sistema
 */
class MaintenanceScheduler extends EventEmitter {
  constructor(options = {}) {
    super();

    this.projectRoot = options.projectRoot || process.cwd();
    this.metricsPersistence = options.metricsPersistence;
    this.memoryManager = options.memoryManager;
    this.webIntelligence = options.webIntelligence;

    // Intervalos en milisegundos
    this.intervals = {
      hourly: 60 * 60 * 1000,           // 1 hora
      daily: 24 * 60 * 60 * 1000,       // 1 día
      weekly: 7 * 24 * 60 * 60 * 1000,  // 7 días
      monthly: 30 * 24 * 60 * 60 * 1000 // 30 días
    };

    // Configuración de tareas
    this.config = {
      dataRetention: {
        sessions: options.sessionRetentionDays || 90,
        logs: options.logRetentionDays || 30,
        dailyMetrics: options.metricsRetentionDays || 365
      },
      backupEnabled: options.backupEnabled !== false,
      backupPath: options.backupPath || path.join(this.projectRoot, 'backups'),
      reportsEnabled: options.reportsEnabled !== false,
      reportsPath: options.reportsPath || path.join(this.projectRoot, 'reports')
    };

    // Timers activos
    this.timers = {
      hourly: null,
      daily: null,
      weekly: null,
      monthly: null
    };

    // Estado
    this.isRunning = false;
    this.lastExecution = {
      hourly: null,
      daily: null,
      weekly: null,
      monthly: null
    };

    // Asegurar que directorios existen
    this.ensureDirectories();
  }

  /**
   * Asegura que los directorios necesarios existen
   */
  ensureDirectories() {
    const dirs = [this.config.backupPath, this.config.reportsPath];

    dirs.forEach(dir => {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    });
  }

  /**
   * Inicia el scheduler
   */
  start() {
    if (this.isRunning) {
      console.log('⚠️  [Maintenance] Scheduler ya está ejecutándose');
      return;
    }

    console.log('🔧 [Maintenance] Iniciando scheduler...');

    // Ejecutar tareas iniciales (verificación de salud)
    this.runHealthCheck();

    // Programar tareas recurrentes
    this.scheduleHourlyTasks();
    this.scheduleDailyTasks();
    this.scheduleWeeklyTasks();
    this.scheduleMonthlyTasks();

    this.isRunning = true;
    console.log('✅ [Maintenance] Scheduler activo');
    this.emit('started');
  }

  /**
   * Detiene el scheduler
   */
  stop() {
    if (!this.isRunning) {
      console.log('⚠️  [Maintenance] Scheduler no está ejecutándose');
      return;
    }

    console.log('🛑 [Maintenance] Deteniendo scheduler...');

    // Limpiar todos los timers
    Object.keys(this.timers).forEach(key => {
      if (this.timers[key]) {
        clearInterval(this.timers[key]);
        this.timers[key] = null;
      }
    });

    this.isRunning = false;
    console.log('✅ [Maintenance] Scheduler detenido');
    this.emit('stopped');
  }

  /**
   * Programa tareas cada hora
   */
  scheduleHourlyTasks() {
    this.timers.hourly = setInterval(() => {
      this.runHourlyTasks();
    }, this.intervals.hourly);

    console.log('⏰ [Maintenance] Tareas horarias programadas');
  }

  /**
   * Programa tareas diarias
   */
  scheduleDailyTasks() {
    // Ejecutar a las 2 AM
    const now = new Date();
    const scheduledTime = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
      2, 0, 0
    );

    // Si ya pasaron las 2 AM hoy, programar para mañana
    if (now > scheduledTime) {
      scheduledTime.setDate(scheduledTime.getDate() + 1);
    }

    const msUntilScheduled = scheduledTime - now;

    // Ejecutar por primera vez
    setTimeout(() => {
      this.runDailyTasks();

      // Luego programar cada 24 horas
      this.timers.daily = setInterval(() => {
        this.runDailyTasks();
      }, this.intervals.daily);
    }, msUntilScheduled);

    console.log(`⏰ [Maintenance] Tareas diarias programadas para las 2:00 AM`);
  }

  /**
   * Programa tareas semanales
   */
  scheduleWeeklyTasks() {
    // Ejecutar los domingos a las 3 AM
    const now = new Date();
    const scheduledTime = new Date(now);

    scheduledTime.setHours(3, 0, 0, 0);

    // Calcular días hasta el próximo domingo (0 = domingo)
    const daysUntilSunday = (7 - now.getDay()) % 7;
    scheduledTime.setDate(now.getDate() + daysUntilSunday);

    // Si ya es domingo después de las 3 AM, programar para la próxima semana
    if (now.getDay() === 0 && now.getHours() >= 3) {
      scheduledTime.setDate(scheduledTime.getDate() + 7);
    }

    const msUntilScheduled = scheduledTime - now;

    setTimeout(() => {
      this.runWeeklyTasks();

      this.timers.weekly = setInterval(() => {
        this.runWeeklyTasks();
      }, this.intervals.weekly);
    }, msUntilScheduled);

    console.log(`⏰ [Maintenance] Tareas semanales programadas para domingos 3:00 AM`);
  }

  /**
   * Programa tareas mensuales
   */
  scheduleMonthlyTasks() {
    // Ejecutar el primer día de cada mes a las 4 AM
    const now = new Date();
    const scheduledTime = new Date(
      now.getFullYear(),
      now.getMonth(),
      1, // Primer día del mes
      4, 0, 0
    );

    // Si ya pasó este mes, programar para el próximo
    if (now > scheduledTime) {
      scheduledTime.setMonth(scheduledTime.getMonth() + 1);
    }

    const msUntilScheduled = scheduledTime - now;

    setTimeout(() => {
      this.runMonthlyTasks();

      this.timers.monthly = setInterval(() => {
        this.runMonthlyTasks();
      }, this.intervals.monthly);
    }, msUntilScheduled);

    console.log(`⏰ [Maintenance] Tareas mensuales programadas para día 1 a las 4:00 AM`);
  }

  /**
   * Ejecuta tareas cada hora
   */
  async runHourlyTasks() {
    console.log('\n⏱️  [Maintenance] Ejecutando tareas horarias...');
    this.lastExecution.hourly = Date.now();

    try {
      // Verificación de salud del sistema
      await this.runHealthCheck();

      this.emit('hourly:complete');
      console.log('✅ [Maintenance] Tareas horarias completadas\n');
    } catch (error) {
      console.error('❌ [Maintenance] Error en tareas horarias:', error);
      this.emit('hourly:error', error);
    }
  }

  /**
   * Ejecuta tareas diarias
   */
  async runDailyTasks() {
    console.log('\n📅 [Maintenance] Ejecutando tareas diarias...');
    this.lastExecution.daily = Date.now();

    try {
      // 1. Generar reporte diario
      if (this.config.reportsEnabled) {
        await this.generateDailyReport();
      }

      // 2. Guardar métricas diarias
      await this.saveDailyMetrics();

      // 3. Backup de base de datos
      if (this.config.backupEnabled) {
        await this.backupDatabase();
      }

      // 4. Limpieza de logs antiguos
      await this.cleanOldLogs();

      this.emit('daily:complete');
      console.log('✅ [Maintenance] Tareas diarias completadas\n');
    } catch (error) {
      console.error('❌ [Maintenance] Error en tareas diarias:', error);
      this.emit('daily:error', error);
    }
  }

  /**
   * Ejecuta tareas semanales
   */
  async runWeeklyTasks() {
    console.log('\n📆 [Maintenance] Ejecutando tareas semanales...');
    this.lastExecution.weekly = Date.now();

    try {
      // 1. Generar reporte semanal
      if (this.config.reportsEnabled) {
        await this.generateWeeklyReport();
      }

      // 2. Limpieza de sesiones antiguas
      await this.cleanOldSessions();

      // 3. Optimización de base de datos
      await this.optimizeDatabase();

      // 4. Limpieza de backups antiguos
      await this.cleanOldBackups();

      this.emit('weekly:complete');
      console.log('✅ [Maintenance] Tareas semanales completadas\n');
    } catch (error) {
      console.error('❌ [Maintenance] Error en tareas semanales:', error);
      this.emit('weekly:error', error);
    }
  }

  /**
   * Ejecuta tareas mensuales
   */
  async runMonthlyTasks() {
    console.log('\n📊 [Maintenance] Ejecutando tareas mensuales...');
    this.lastExecution.monthly = Date.now();

    try {
      // 1. Generar reporte mensual
      if (this.config.reportsEnabled) {
        await this.generateMonthlyReport();
      }

      // 2. Limpieza profunda de datos
      await this.deepCleanData();

      // 3. Análisis de tendencias
      await this.analyzeTrends();

      this.emit('monthly:complete');
      console.log('✅ [Maintenance] Tareas mensuales completadas\n');
    } catch (error) {
      console.error('❌ [Maintenance] Error en tareas mensuales:', error);
      this.emit('monthly:error', error);
    }
  }

  /**
   * Verificación de salud del sistema
   */
  async runHealthCheck() {
    console.log('🏥 [Maintenance] Verificando salud del sistema...');

    const health = {
      timestamp: Date.now(),
      status: 'healthy',
      checks: {}
    };

    try {
      // Check 1: Base de datos accesible
      if (this.metricsPersistence) {
        const stats = this.metricsPersistence.getGlobalStats();
        health.checks.database = {
          status: 'ok',
          sessions: stats.totalSessions
        };
      }

      // Check 2: Memoria disponible
      const memUsage = process.memoryUsage();
      health.checks.memory = {
        status: memUsage.heapUsed < 500 * 1024 * 1024 ? 'ok' : 'warning',
        heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024) + ' MB',
        heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024) + ' MB'
      };

      // Check 3: Espacio en disco
      const dbPath = path.join(this.projectRoot, 'memory', 'metrics.db');
      if (fs.existsSync(dbPath)) {
        const dbSize = fs.statSync(dbPath).size;
        health.checks.diskSpace = {
          status: dbSize < 100 * 1024 * 1024 ? 'ok' : 'warning',
          dbSize: Math.round(dbSize / 1024) + ' KB'
        };
      }

      console.log('✅ [Maintenance] Sistema saludable');
      this.emit('health:ok', health);

      return health;
    } catch (error) {
      health.status = 'error';
      health.error = error.message;
      console.error('❌ [Maintenance] Problemas de salud:', error);
      this.emit('health:error', health);

      return health;
    }
  }

  /**
   * Genera reporte diario
   */
  async generateDailyReport() {
    console.log('📝 [Maintenance] Generando reporte diario...');

    if (!this.metricsPersistence) {
      console.log('⚠️  [Maintenance] MetricsPersistence no disponible');
      return null;
    }

    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    const todayStr = today.toISOString().split('T')[0];
    const yesterdayTimestamp = yesterday.getTime();
    const todayTimestamp = today.getTime();

    // Obtener sesiones del día
    const sessions = this.metricsPersistence.getSessionHistory({
      fromDate: yesterdayTimestamp,
      toDate: todayTimestamp,
      limit: 1000
    });

    // Calcular métricas
    const report = {
      date: todayStr,
      period: 'daily',
      summary: {
        totalSessions: sessions.length,
        successfulSessions: sessions.filter(s => s.content.summary.failed === 0).length,
        failedSessions: sessions.filter(s => s.content.summary.failed > 0).length,
        averageScore: sessions.length > 0
          ? Math.round(sessions.reduce((sum, s) => sum + s.content.summary.averageScore, 0) / sessions.length)
          : 0,
        totalSubtasks: sessions.reduce((sum, s) => sum + s.content.summary.total, 0),
        successfulSubtasks: sessions.reduce((sum, s) => sum + s.content.summary.successful, 0),
        totalDuration: sessions.reduce((sum, s) => sum + (s.content.duration || 0), 0)
      },
      topTasks: this.getTopTasks(sessions, 5),
      subtasksByType: this.countSubtasksByType(sessions),
      timestamp: Date.now()
    };

    // Guardar reporte
    const reportPath = path.join(
      this.config.reportsPath,
      `daily-${todayStr}.json`
    );
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

    console.log(`✅ [Maintenance] Reporte diario guardado: ${reportPath}`);
    this.emit('report:daily', report);

    return report;
  }

  /**
   * Genera reporte semanal
   */
  async generateWeeklyReport() {
    console.log('📝 [Maintenance] Generando reporte semanal...');

    if (!this.metricsPersistence) {
      console.log('⚠️  [Maintenance] MetricsPersistence no disponible');
      return null;
    }

    const today = new Date();
    const weekAgo = new Date(today);
    weekAgo.setDate(weekAgo.getDate() - 7);

    const weekStr = `${weekAgo.toISOString().split('T')[0]}_to_${today.toISOString().split('T')[0]}`;

    // Obtener sesiones de la semana
    const sessions = this.metricsPersistence.getSessionHistory({
      fromDate: weekAgo.getTime(),
      toDate: today.getTime(),
      limit: 10000
    });

    const report = {
      week: weekStr,
      period: 'weekly',
      summary: {
        totalSessions: sessions.length,
        successfulSessions: sessions.filter(s => s.content.summary.failed === 0).length,
        averageScore: sessions.length > 0
          ? Math.round(sessions.reduce((sum, s) => sum + s.content.summary.averageScore, 0) / sessions.length)
          : 0,
        totalSubtasks: sessions.reduce((sum, s) => sum + s.content.summary.total, 0),
        totalDuration: sessions.reduce((sum, s) => sum + (s.content.duration || 0), 0)
      },
      dailyBreakdown: this.getDailyBreakdown(sessions),
      topTasks: this.getTopTasks(sessions, 10),
      subtasksByType: this.countSubtasksByType(sessions),
      trends: this.calculateTrends(sessions),
      timestamp: Date.now()
    };

    // Guardar reporte
    const reportPath = path.join(
      this.config.reportsPath,
      `weekly-${weekStr}.json`
    );
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

    console.log(`✅ [Maintenance] Reporte semanal guardado: ${reportPath}`);
    this.emit('report:weekly', report);

    return report;
  }

  /**
   * Genera reporte mensual
   */
  async generateMonthlyReport() {
    console.log('📝 [Maintenance] Generando reporte mensual...');

    if (!this.metricsPersistence) {
      console.log('⚠️  [Maintenance] MetricsPersistence no disponible');
      return null;
    }

    const today = new Date();
    const monthAgo = new Date(today);
    monthAgo.setMonth(monthAgo.getMonth() - 1);

    const monthStr = `${monthAgo.getFullYear()}-${String(monthAgo.getMonth() + 1).padStart(2, '0')}`;

    // Obtener sesiones del mes
    const sessions = this.metricsPersistence.getSessionHistory({
      fromDate: monthAgo.getTime(),
      toDate: today.getTime(),
      limit: 100000
    });

    const report = {
      month: monthStr,
      period: 'monthly',
      summary: {
        totalSessions: sessions.length,
        successfulSessions: sessions.filter(s => s.content.summary.failed === 0).length,
        averageScore: sessions.length > 0
          ? Math.round(sessions.reduce((sum, s) => sum + s.content.summary.averageScore, 0) / sessions.length)
          : 0,
        totalSubtasks: sessions.reduce((sum, s) => sum + s.content.summary.total, 0),
        totalDuration: sessions.reduce((sum, s) => sum + (s.content.duration || 0), 0)
      },
      weeklyBreakdown: this.getWeeklyBreakdown(sessions),
      topTasks: this.getTopTasks(sessions, 20),
      subtasksByType: this.countSubtasksByType(sessions),
      trends: this.calculateTrends(sessions),
      insights: this.generateInsights(sessions),
      timestamp: Date.now()
    };

    // Guardar reporte
    const reportPath = path.join(
      this.config.reportsPath,
      `monthly-${monthStr}.json`
    );
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

    console.log(`✅ [Maintenance] Reporte mensual guardado: ${reportPath}`);
    this.emit('report:monthly', report);

    return report;
  }

  /**
   * Guarda métricas diarias en la DB
   */
  async saveDailyMetrics() {
    console.log('💾 [Maintenance] Guardando métricas diarias...');

    if (!this.metricsPersistence) return;

    const today = new Date().toISOString().split('T')[0];
    const stats = this.metricsPersistence.getGlobalStats();

    const webStats = this.webIntelligence ? this.webIntelligence.getStats() : {};
    const memoryStats = this.memoryManager ? this.memoryManager.getStats() : {};

    this.metricsPersistence.saveDailyMetrics(today, {
      totalSessions: stats.totalSessions || 0,
      successfulSessions: stats.successfulSessions || 0,
      averageScore: stats.averageScore || 0,
      totalSubtasks: stats.totalSubtasksCompleted || 0,
      webSearches: webStats.totalSearches || 0,
      knowledgeAcquired: webStats.totalKnowledge || 0,
      conceptsExtracted: webStats.totalConcepts || 0,
      totalMemories: memoryStats.totalMemories || 0,
      shortTermMemories: memoryStats.shortTermCount || 0,
      longTermMemories: memoryStats.longTermCount || 0
    });

    console.log('✅ [Maintenance] Métricas diarias guardadas');
  }

  /**
   * Backup de base de datos
   */
  async backupDatabase() {
    console.log('💾 [Maintenance] Creando backup de base de datos...');

    const dbPath = path.join(this.projectRoot, 'memory', 'metrics.db');
    if (!fs.existsSync(dbPath)) {
      console.log('⚠️  [Maintenance] Base de datos no encontrada');
      return;
    }

    const today = new Date().toISOString().split('T')[0];
    const backupPath = path.join(this.config.backupPath, `metrics-${today}.db`);

    fs.copyFileSync(dbPath, backupPath);

    const sizeKB = (fs.statSync(backupPath).size / 1024).toFixed(2);
    console.log(`✅ [Maintenance] Backup creado: ${backupPath} (${sizeKB} KB)`);
    this.emit('backup:created', { path: backupPath, size: sizeKB });
  }

  /**
   * Limpia logs antiguos
   */
  async cleanOldLogs() {
    console.log('🧹 [Maintenance] Limpiando logs antiguos...');

    if (!this.metricsPersistence) return;

    const retention = { logs: this.config.dataRetention.logs };
    this.metricsPersistence.cleanOldData(retention);

    console.log(`✅ [Maintenance] Logs anteriores a ${retention.logs} días eliminados`);
  }

  /**
   * Limpia sesiones antiguas
   */
  async cleanOldSessions() {
    console.log('🧹 [Maintenance] Limpiando sesiones antiguas...');

    if (!this.metricsPersistence) return;

    const retention = { sessions: this.config.dataRetention.sessions };
    this.metricsPersistence.cleanOldData(retention);

    console.log(`✅ [Maintenance] Sesiones anteriores a ${retention.sessions} días eliminadas`);
  }

  /**
   * Optimiza la base de datos
   */
  async optimizeDatabase() {
    console.log('⚡ [Maintenance] Optimizando base de datos...');

    if (!this.metricsPersistence || !this.metricsPersistence.db) {
      console.log('⚠️  [Maintenance] Base de datos no disponible');
      return;
    }

    const before = fs.statSync(path.join(this.projectRoot, 'memory', 'metrics.db')).size;

    this.metricsPersistence.db.exec('VACUUM');
    this.metricsPersistence.db.exec('ANALYZE');

    const after = fs.statSync(path.join(this.projectRoot, 'memory', 'metrics.db')).size;
    const savedKB = ((before - after) / 1024).toFixed(2);

    console.log(`✅ [Maintenance] Base de datos optimizada (liberados ${savedKB} KB)`);
  }

  /**
   * Limpia backups antiguos
   */
  async cleanOldBackups() {
    console.log('🧹 [Maintenance] Limpiando backups antiguos...');

    const backups = fs.readdirSync(this.config.backupPath)
      .filter(f => f.endsWith('.db'))
      .map(f => ({
        name: f,
        path: path.join(this.config.backupPath, f),
        mtime: fs.statSync(path.join(this.config.backupPath, f)).mtimeMs
      }))
      .sort((a, b) => b.mtime - a.mtime);

    // Mantener solo los últimos 30 backups
    const toDelete = backups.slice(30);

    toDelete.forEach(backup => {
      fs.unlinkSync(backup.path);
      console.log(`   🗑️  Eliminado: ${backup.name}`);
    });

    console.log(`✅ [Maintenance] ${toDelete.length} backups antiguos eliminados`);
  }

  /**
   * Limpieza profunda de datos
   */
  async deepCleanData() {
    console.log('🧹 [Maintenance] Limpieza profunda de datos...');

    if (!this.metricsPersistence) return;

    this.metricsPersistence.cleanOldData(this.config.dataRetention);

    console.log('✅ [Maintenance] Limpieza profunda completada');
  }

  /**
   * Analiza tendencias
   */
  async analyzeTrends() {
    console.log('📈 [Maintenance] Analizando tendencias...');

    if (!this.metricsPersistence) return;

    // Obtener sesiones del último mes
    const monthAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);
    const sessions = this.metricsPersistence.getSessionHistory({
      fromDate: monthAgo,
      limit: 10000
    });

    const trends = this.calculateTrends(sessions);

    console.log('✅ [Maintenance] Análisis de tendencias completado');
    console.log(`   Score promedio: ${trends.averageScore}%`);
    console.log(`   Tendencia: ${trends.scoreTrend > 0 ? '↗️ Mejorando' : trends.scoreTrend < 0 ? '↘️ Empeorando' : '→ Estable'}`);

    this.emit('trends:analyzed', trends);
  }

  // =============== UTILIDADES ===============

  getTopTasks(sessions, limit = 5) {
    const taskCounts = {};

    sessions.forEach(s => {
      const task = s.content.task;
      if (!taskCounts[task]) {
        taskCounts[task] = { count: 0, avgScore: 0, totalScore: 0 };
      }
      taskCounts[task].count++;
      taskCounts[task].totalScore += s.content.summary.averageScore;
    });

    Object.keys(taskCounts).forEach(task => {
      taskCounts[task].avgScore = Math.round(taskCounts[task].totalScore / taskCounts[task].count);
      delete taskCounts[task].totalScore;
    });

    return Object.entries(taskCounts)
      .sort((a, b) => b[1].count - a[1].count)
      .slice(0, limit)
      .map(([task, data]) => ({ task, ...data }));
  }

  countSubtasksByType(sessions) {
    const counts = {};

    sessions.forEach(s => {
      s.content.plan.subtasks.forEach(st => {
        const type = st.type || 'unknown';
        counts[type] = (counts[type] || 0) + 1;
      });
    });

    return counts;
  }

  getDailyBreakdown(sessions) {
    const daily = {};

    sessions.forEach(s => {
      const date = new Date(s.timestamp).toISOString().split('T')[0];
      if (!daily[date]) {
        daily[date] = { sessions: 0, successful: 0, avgScore: 0, totalScore: 0 };
      }
      daily[date].sessions++;
      if (s.content.summary.failed === 0) daily[date].successful++;
      daily[date].totalScore += s.content.summary.averageScore;
    });

    Object.keys(daily).forEach(date => {
      daily[date].avgScore = Math.round(daily[date].totalScore / daily[date].sessions);
      delete daily[date].totalScore;
    });

    return daily;
  }

  getWeeklyBreakdown(sessions) {
    // Agrupar por semanas
    const weekly = {};

    sessions.forEach(s => {
      const date = new Date(s.timestamp);
      const weekStart = new Date(date);
      weekStart.setDate(date.getDate() - date.getDay());
      const weekKey = weekStart.toISOString().split('T')[0];

      if (!weekly[weekKey]) {
        weekly[weekKey] = { sessions: 0, successful: 0, avgScore: 0, totalScore: 0 };
      }
      weekly[weekKey].sessions++;
      if (s.content.summary.failed === 0) weekly[weekKey].successful++;
      weekly[weekKey].totalScore += s.content.summary.averageScore;
    });

    Object.keys(weekly).forEach(week => {
      weekly[week].avgScore = Math.round(weekly[week].totalScore / weekly[week].sessions);
      delete weekly[week].totalScore;
    });

    return weekly;
  }

  calculateTrends(sessions) {
    if (sessions.length < 2) {
      return { scoreTrend: 0, sessionTrend: 0, averageScore: 0 };
    }

    // Ordenar por timestamp
    const sorted = sessions.sort((a, b) => a.timestamp - b.timestamp);

    // Dividir en dos mitades
    const half = Math.floor(sorted.length / 2);
    const firstHalf = sorted.slice(0, half);
    const secondHalf = sorted.slice(half);

    const firstAvg = firstHalf.reduce((sum, s) => sum + s.content.summary.averageScore, 0) / firstHalf.length;
    const secondAvg = secondHalf.reduce((sum, s) => sum + s.content.summary.averageScore, 0) / secondHalf.length;

    return {
      scoreTrend: Math.round(secondAvg - firstAvg),
      sessionTrend: secondHalf.length - firstHalf.length,
      averageScore: Math.round((firstAvg + secondAvg) / 2)
    };
  }

  generateInsights(sessions) {
    const insights = [];

    // Insight 1: Tasa de éxito
    const successRate = (sessions.filter(s => s.content.summary.failed === 0).length / sessions.length * 100).toFixed(1);
    insights.push(`Tasa de éxito: ${successRate}%`);

    // Insight 2: Tipo de tarea más común
    const typeCounts = this.countSubtasksByType(sessions);
    const mostCommon = Object.entries(typeCounts).sort((a, b) => b[1] - a[1])[0];
    if (mostCommon) {
      insights.push(`Tipo de sub-tarea más común: ${mostCommon[0]} (${mostCommon[1]} veces)`);
    }

    // Insight 3: Duración promedio
    const avgDuration = sessions.reduce((sum, s) => sum + (s.content.duration || 0), 0) / sessions.length;
    insights.push(`Duración promedio: ${Math.round(avgDuration / 60)} minutos`);

    return insights;
  }

  /**
   * Obtiene el estado actual del scheduler
   */
  getStatus() {
    return {
      isRunning: this.isRunning,
      lastExecution: this.lastExecution,
      config: this.config
    };
  }
}

module.exports = MaintenanceScheduler;

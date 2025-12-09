// core/email-automation.js
// J.A.R.V.I.S. Email Automation Module
// Sistema de alertas, reportes y notificaciones automáticas

import nodemailer from 'nodemailer';
import fs from 'fs/promises';
import path from 'path';

class EmailAutomation {
  constructor() {
    this.transporter = null;
    this.initialized = false;
    this.config = {
      user: process.env.GMAIL_USER || null,
      password: process.env.GMAIL_PASSWORD || null,
      from: process.env.EMAIL_FROM || process.env.GMAIL_USER,
      to: process.env.EMAIL_TO || process.env.GMAIL_USER,
      enableAlerts: process.env.EMAIL_ALERTS !== 'false', // Default true
      enableReports: process.env.EMAIL_REPORTS !== 'false', // Default true
    };
    this.templates = {};
    this.sentEmails = [];
  }

  /**
   * Inicializa el módulo de email
   */
  async initialize() {
    console.log('🔧 [Email] Inicializando módulo de automatización de emails...');

    if (!this.config.user || !this.config.password) {
      console.log('⚠️  [Email] Credenciales no configuradas - Modo sin email activado');
      console.log('   Configura GMAIL_USER y GMAIL_PASSWORD en .env para activar');
      this.initialized = false;
      return false;
    }

    try {
      // Crear transporter de nodemailer
      this.transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: this.config.user,
          pass: this.config.password
        }
      });

      // Verificar conexión
      await this.transporter.verify();

      console.log('✅ [Email] Email automation inicializado correctamente');
      console.log(`   📧 Desde: ${this.config.from}`);
      console.log(`   📬 Para: ${this.config.to}`);

      this.initialized = true;

      // Cargar templates
      await this.loadTemplates();

      return true;
    } catch (error) {
      console.error('❌ [Email] Error inicializando email:', error.message);
      this.initialized = false;
      return false;
    }
  }

  /**
   * Carga templates de email
   */
  async loadTemplates() {
    this.templates = {
      alert: {
        subject: '⚠️ ALERTA JARVIS: {title}',
        body: `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #f44336; color: white; padding: 20px; border-radius: 5px 5px 0 0; }
    .content { background: #f9f9f9; padding: 20px; border: 1px solid #ddd; }
    .footer { background: #333; color: white; padding: 10px; text-align: center; font-size: 12px; border-radius: 0 0 5px 5px; }
    .alert-icon { font-size: 48px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="alert-icon">⚠️</div>
      <h2>ALERTA DE J.A.R.V.I.S.</h2>
    </div>
    <div class="content">
      <h3>{title}</h3>
      <p>{message}</p>
      {details}
      <p><strong>Timestamp:</strong> {timestamp}</p>
    </div>
    <div class="footer">
      🤖 Generado automáticamente por J.A.R.V.I.S. PURO<br>
      Just A Rather Very Intelligent System
    </div>
  </div>
</body>
</html>
`
      },

      dailyReport: {
        subject: '📊 Reporte Diario JARVIS - {date}',
        body: `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 700px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; border-radius: 5px 5px 0 0; }
    .section { background: #fff; padding: 20px; margin: 10px 0; border: 1px solid #ddd; border-radius: 5px; }
    .stat { display: inline-block; margin: 10px; padding: 15px; background: #f0f0f0; border-radius: 5px; }
    .stat-value { font-size: 32px; font-weight: bold; color: #667eea; }
    .stat-label { font-size: 14px; color: #666; }
    .footer { background: #333; color: white; padding: 15px; text-align: center; font-size: 12px; border-radius: 0 0 5px 5px; }
    .list-item { padding: 8px; border-bottom: 1px solid #eee; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>📊 REPORTE DIARIO</h1>
      <p>{date}</p>
    </div>

    <div class="section">
      <h3>📈 Estadísticas del Día</h3>
      {stats}
    </div>

    <div class="section">
      <h3>💻 Actividad Git</h3>
      {gitActivity}
    </div>

    <div class="section">
      <h3>🚨 Alertas Generadas</h3>
      {alerts}
    </div>

    <div class="section">
      <h3>🧠 Memoria & Aprendizaje</h3>
      {memory}
    </div>

    <div class="footer">
      🤖 Generado automáticamente por J.A.R.V.I.S. PURO<br>
      Just A Rather Very Intelligent System
    </div>
  </div>
</body>
</html>
`
      },

      weeklyReport: {
        subject: '📅 Reporte Semanal JARVIS - Semana {week}',
        body: `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 800px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #11998e 0%, #38ef7d 100%); color: white; padding: 30px; border-radius: 5px 5px 0 0; }
    .section { background: #fff; padding: 20px; margin: 10px 0; border: 1px solid #ddd; border-radius: 5px; }
    .chart { margin: 20px 0; }
    .footer { background: #333; color: white; padding: 15px; text-align: center; font-size: 12px; border-radius: 0 0 5px 5px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>📅 REPORTE SEMANAL</h1>
      <p>Semana {week} - {dateRange}</p>
    </div>

    <div class="section">
      <h3>🏆 Resumen de la Semana</h3>
      {summary}
    </div>

    <div class="section">
      <h3>📊 Estadísticas</h3>
      {stats}
    </div>

    <div class="section">
      <h3>💡 Insights & Recomendaciones</h3>
      {insights}
    </div>

    <div class="footer">
      🤖 Generado automáticamente por J.A.R.V.I.S. PURO
    </div>
  </div>
</body>
</html>
`
      },

      notification: {
        subject: '🔔 Notificación JARVIS: {title}',
        body: `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #4CAF50; color: white; padding: 20px; border-radius: 5px 5px 0 0; }
    .content { background: #f9f9f9; padding: 20px; border: 1px solid #ddd; }
    .footer { background: #333; color: white; padding: 10px; text-align: center; font-size: 12px; border-radius: 0 0 5px 5px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h2>🔔 {title}</h2>
    </div>
    <div class="content">
      <p>{message}</p>
      {details}
    </div>
    <div class="footer">
      🤖 J.A.R.V.I.S. PURO
    </div>
  </div>
</body>
</html>
`
      }
    };
  }

  // ═════════════════════════════════════════════════════════════
  // ALERTAS CRÍTICAS
  // ═════════════════════════════════════════════════════════════

  /**
   * Envía alerta de cambios sin commit
   */
  async alertUncommittedChanges(totalChanges, files) {
    if (!this.initialized || !this.config.enableAlerts) return;

    const details = `
      <h4>Archivos afectados:</h4>
      <ul>
        ${files.modified.slice(0, 10).map(f => `<li>📝 Modificado: ${f}</li>`).join('')}
        ${files.untracked.slice(0, 10).map(f => `<li>❓ Sin seguimiento: ${f}</li>`).join('')}
        ${files.deleted.slice(0, 5).map(f => `<li>🗑️ Eliminado: ${f}</li>`).join('')}
      </ul>
      ${totalChanges > 15 ? `<p><em>... y ${totalChanges - 15} más</em></p>` : ''}
    `;

    return this.sendAlert(
      'Cambios sin commit detectados',
      `Se detectaron ${totalChanges} archivos con cambios pendientes de commit.`,
      details
    );
  }

  /**
   * Envía alerta de branch desactualizada
   */
  async alertOutdatedBranch(branch, behindBy) {
    if (!this.initialized || !this.config.enableAlerts) return;

    const details = `
      <p><strong>Rama:</strong> ${branch}</p>
      <p><strong>Commits atrasados:</strong> ${behindBy}</p>
      <p><strong>Recomendación:</strong> Ejecutar <code>git pull</code> para actualizar</p>
    `;

    return this.sendAlert(
      'Branch desactualizada',
      `La rama "${branch}" está ${behindBy} commits atrasada respecto al remoto.`,
      details
    );
  }

  /**
   * Envía alerta de errores en logs
   */
  async alertLogErrors(errorsFound, errors) {
    if (!this.initialized || !this.config.enableAlerts) return;

    const details = `
      <h4>Errores encontrados:</h4>
      <ul>
        ${errors.slice(0, 5).map(e => `
          <li>
            <strong>${e.file}:${e.line}</strong><br>
            <code style="background:#f0f0f0;padding:5px;display:block;margin:5px 0;">
              ${e.content.substring(0, 150)}...
            </code>
          </li>
        `).join('')}
      </ul>
    `;

    return this.sendAlert(
      'Errores detectados en logs',
      `Se encontraron ${errorsFound} errores en los archivos de log.`,
      details
    );
  }

  /**
   * Envía alerta de GitHub issue crítica
   */
  async alertCriticalIssue(issue) {
    if (!this.initialized || !this.config.enableAlerts) return;

    const details = `
      <p><strong>Número:</strong> #${issue.number}</p>
      <p><strong>Autor:</strong> ${issue.author}</p>
      <p><strong>Labels:</strong> ${issue.labels.join(', ')}</p>
      <p><strong>Comentarios:</strong> ${issue.comments}</p>
      <p><a href="${issue.url}" style="color:#667eea;">Ver issue en GitHub →</a></p>
    `;

    return this.sendAlert(
      `Issue crítica: ${issue.title}`,
      'Se ha detectado un issue marcado como crítico en GitHub.',
      details
    );
  }

  /**
   * Envía alerta de fallo en comando
   */
  async alertCommandFailure(command, error) {
    if (!this.initialized || !this.config.enableAlerts) return;

    const details = `
      <p><strong>Comando:</strong> <code>${command}</code></p>
      <p><strong>Error:</strong></p>
      <pre style="background:#f0f0f0;padding:10px;border-radius:5px;">
${error.substring(0, 500)}
      </pre>
    `;

    return this.sendAlert(
      'Fallo en ejecución de comando',
      `El comando "${command}" falló durante su ejecución.`,
      details
    );
  }

  /**
   * Método genérico para enviar alertas
   */
  async sendAlert(title, message, details = '') {
    if (!this.initialized) {
      console.log(`⚠️  [Email] Alerta no enviada (email no configurado): ${title}`);
      return false;
    }

    try {
      const template = this.templates.alert;
      const html = template.body
        .replace(/{title}/g, title)
        .replace(/{message}/g, message)
        .replace(/{details}/g, details)
        .replace(/{timestamp}/g, new Date().toLocaleString('es-ES'));

      const mailOptions = {
        from: this.config.from,
        to: this.config.to,
        subject: template.subject.replace('{title}', title),
        html
      };

      const info = await this.transporter.sendMail(mailOptions);

      this.sentEmails.push({
        type: 'alert',
        title,
        timestamp: new Date(),
        messageId: info.messageId
      });

      console.log(`✅ [Email] Alerta enviada: ${title}`);
      return true;
    } catch (error) {
      console.error(`❌ [Email] Error enviando alerta:`, error.message);
      return false;
    }
  }

  // ═════════════════════════════════════════════════════════════
  // REPORTES AUTOMÁTICOS
  // ═════════════════════════════════════════════════════════════

  /**
   * Envía reporte diario
   */
  async sendDailyReport(data) {
    if (!this.initialized || !this.config.enableReports) {
      console.log('⚠️  [Email] Reporte diario no enviado (email no configurado)');
      return false;
    }

    try {
      const today = new Date().toLocaleDateString('es-ES', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });

      // Generar secciones del reporte
      const stats = this.generateStatsSection(data.stats);
      const gitActivity = this.generateGitSection(data.git);
      const alerts = this.generateAlertsSection(data.alerts);
      const memory = this.generateMemorySection(data.memory);

      const template = this.templates.dailyReport;
      const html = template.body
        .replace(/{date}/g, today)
        .replace(/{stats}/g, stats)
        .replace(/{gitActivity}/g, gitActivity)
        .replace(/{alerts}/g, alerts)
        .replace(/{memory}/g, memory);

      const mailOptions = {
        from: this.config.from,
        to: this.config.to,
        subject: template.subject.replace('{date}', today),
        html
      };

      const info = await this.transporter.sendMail(mailOptions);

      this.sentEmails.push({
        type: 'daily_report',
        timestamp: new Date(),
        messageId: info.messageId
      });

      console.log(`✅ [Email] Reporte diario enviado`);
      return true;
    } catch (error) {
      console.error(`❌ [Email] Error enviando reporte diario:`, error.message);
      return false;
    }
  }

  /**
   * Envía reporte semanal
   */
  async sendWeeklyReport(data) {
    if (!this.initialized || !this.config.enableReports) return false;

    try {
      const weekNumber = this.getWeekNumber(new Date());
      const dateRange = this.getWeekDateRange();

      const summary = this.generateWeeklySummary(data.summary);
      const stats = this.generateWeeklyStats(data.stats);
      const insights = this.generateInsights(data.insights);

      const template = this.templates.weeklyReport;
      const html = template.body
        .replace(/{week}/g, weekNumber)
        .replace(/{dateRange}/g, dateRange)
        .replace(/{summary}/g, summary)
        .replace(/{stats}/g, stats)
        .replace(/{insights}/g, insights);

      const mailOptions = {
        from: this.config.from,
        to: this.config.to,
        subject: template.subject.replace('{week}', weekNumber),
        html
      };

      const info = await this.transporter.sendMail(mailOptions);

      this.sentEmails.push({
        type: 'weekly_report',
        timestamp: new Date(),
        messageId: info.messageId
      });

      console.log(`✅ [Email] Reporte semanal enviado`);
      return true;
    } catch (error) {
      console.error(`❌ [Email] Error enviando reporte semanal:`, error.message);
      return false;
    }
  }

  // ═════════════════════════════════════════════════════════════
  // NOTIFICACIONES EN TIEMPO REAL
  // ═════════════════════════════════════════════════════════════

  /**
   * Notifica auto-commit completado
   */
  async notifyAutoCommit(commitMessage, filesChanged) {
    if (!this.initialized) return false;

    const details = `
      <p><strong>Mensaje del commit:</strong></p>
      <pre style="background:#f0f0f0;padding:10px;border-radius:5px;">${commitMessage}</pre>
      <p><strong>Archivos modificados:</strong> ${filesChanged}</p>
    `;

    return this.sendNotification(
      'Auto-commit completado',
      'J.A.R.V.I.S. ha creado un commit automático exitosamente.',
      details
    );
  }

  /**
   * Notifica push exitoso
   */
  async notifyPushSuccess(branch, commits) {
    if (!this.initialized) return false;

    const details = `
      <p><strong>Rama:</strong> ${branch}</p>
      <p><strong>Commits subidos:</strong> ${commits}</p>
    `;

    return this.sendNotification(
      'Push exitoso',
      `Se subieron exitosamente ${commits} commit(s) a la rama ${branch}.`,
      details
    );
  }

  /**
   * Notifica pull con conflictos
   */
  async notifyPullConflicts(conflicts) {
    if (!this.initialized) return false;

    const details = `
      <h4>Archivos con conflictos:</h4>
      <ul>
        ${conflicts.map(f => `<li>⚠️ ${f}</li>`).join('')}
      </ul>
      <p><strong>Acción requerida:</strong> Resolver conflictos manualmente</p>
    `;

    return this.sendAlert(
      'Pull con conflictos',
      `Se detectaron conflictos al hacer pull.`,
      details
    );
  }

  /**
   * Notifica backup completado
   */
  async notifyBackupComplete(filename, size) {
    if (!this.initialized) return false;

    const details = `
      <p><strong>Archivo:</strong> ${filename}</p>
      <p><strong>Tamaño:</strong> ${(size / 1024).toFixed(2)} KB</p>
      <p><strong>Timestamp:</strong> ${new Date().toLocaleString('es-ES')}</p>
    `;

    return this.sendNotification(
      'Backup completado',
      'Se ha completado el backup diario de la base de datos.',
      details
    );
  }

  /**
   * Método genérico para enviar notificaciones
   */
  async sendNotification(title, message, details = '') {
    if (!this.initialized) return false;

    try {
      const template = this.templates.notification;
      const html = template.body
        .replace(/{title}/g, title)
        .replace(/{message}/g, message)
        .replace(/{details}/g, details);

      const mailOptions = {
        from: this.config.from,
        to: this.config.to,
        subject: template.subject.replace('{title}', title),
        html
      };

      await this.transporter.sendMail(mailOptions);

      console.log(`✅ [Email] Notificación enviada: ${title}`);
      return true;
    } catch (error) {
      console.error(`❌ [Email] Error enviando notificación:`, error.message);
      return false;
    }
  }

  // ═════════════════════════════════════════════════════════════
  // HELPERS PARA GENERACIÓN DE REPORTES
  // ═════════════════════════════════════════════════════════════

  generateStatsSection(stats) {
    if (!stats) return '<p>No hay estadísticas disponibles</p>';

    return `
      <div class="stat">
        <div class="stat-value">${stats.commandsProcessed || 0}</div>
        <div class="stat-label">Comandos Procesados</div>
      </div>
      <div class="stat">
        <div class="stat-value">${stats.commits || 0}</div>
        <div class="stat-label">Commits</div>
      </div>
      <div class="stat">
        <div class="stat-value">${stats.filesChanged || 0}</div>
        <div class="stat-label">Archivos Modificados</div>
      </div>
      <div class="stat">
        <div class="stat-value">${stats.alerts || 0}</div>
        <div class="stat-label">Alertas Generadas</div>
      </div>
    `;
  }

  generateGitSection(git) {
    if (!git || git.commits === 0) {
      return '<p>No hubo actividad Git hoy</p>';
    }

    return `
      <p><strong>Commits del día:</strong> ${git.commits}</p>
      <ul>
        ${git.recentCommits ? git.recentCommits.map(c =>
          `<li class="list-item">${c.message} <em>(${c.author})</em></li>`
        ).join('') : ''}
      </ul>
    `;
  }

  generateAlertsSection(alerts) {
    if (!alerts || alerts.length === 0) {
      return '<p>✅ No se generaron alertas hoy</p>';
    }

    return `
      <ul>
        ${alerts.map(a => `
          <li class="list-item">
            <strong>${a.level === 'error' ? '❌' : '⚠️'} ${a.message}</strong><br>
            <small>${new Date(a.timestamp).toLocaleString('es-ES')}</small>
          </li>
        `).join('')}
      </ul>
    `;
  }

  generateMemorySection(memory) {
    if (!memory) return '<p>No hay datos de memoria disponibles</p>';

    return `
      <p><strong>Conversaciones guardadas:</strong> ${memory.conversations || 0}</p>
      <p><strong>Memorias emocionales:</strong> ${memory.emotional_memories || 0}</p>
      <p><strong>Aprendizajes:</strong> ${memory.learnings || 0}</p>
    `;
  }

  generateWeeklySummary(summary) {
    if (!summary) return '<p>No hay resumen disponible</p>';

    return `
      <p>${summary.description || 'Resumen de la semana'}</p>
      <ul>
        <li>📊 Total de comandos: ${summary.totalCommands || 0}</li>
        <li>💻 Total de commits: ${summary.totalCommits || 0}</li>
        <li>🚨 Total de alertas: ${summary.totalAlerts || 0}</li>
      </ul>
    `;
  }

  generateWeeklyStats(stats) {
    if (!stats) return '<p>No hay estadísticas disponibles</p>';

    return `
      <table style="width:100%;border-collapse:collapse;">
        <tr style="background:#f0f0f0;">
          <th style="padding:10px;text-align:left;">Métrica</th>
          <th style="padding:10px;text-align:right;">Valor</th>
        </tr>
        <tr>
          <td style="padding:10px;border-bottom:1px solid #ddd;">Comandos procesados</td>
          <td style="padding:10px;border-bottom:1px solid #ddd;text-align:right;">${stats.commands || 0}</td>
        </tr>
        <tr>
          <td style="padding:10px;border-bottom:1px solid #ddd;">Commits realizados</td>
          <td style="padding:10px;border-bottom:1px solid #ddd;text-align:right;">${stats.commits || 0}</td>
        </tr>
        <tr>
          <td style="padding:10px;border-bottom:1px solid #ddd;">Archivos modificados</td>
          <td style="padding:10px;border-bottom:1px solid #ddd;text-align:right;">${stats.files || 0}</td>
        </tr>
      </table>
    `;
  }

  generateInsights(insights) {
    if (!insights || insights.length === 0) {
      return '<p>No hay insights esta semana</p>';
    }

    return `
      <ul>
        ${insights.map(i => `<li>💡 ${i}</li>`).join('')}
      </ul>
    `;
  }

  getWeekNumber(date) {
    const onejan = new Date(date.getFullYear(), 0, 1);
    const millisecsInDay = 86400000;
    return Math.ceil((((date.getTime() - onejan.getTime()) / millisecsInDay) + onejan.getDay() + 1) / 7);
  }

  getWeekDateRange() {
    const now = new Date();
    const first = now.getDate() - now.getDay();
    const last = first + 6;

    const firstday = new Date(now.setDate(first));
    const lastday = new Date(now.setDate(last));

    return `${firstday.toLocaleDateString('es-ES')} - ${lastday.toLocaleDateString('es-ES')}`;
  }

  /**
   * Obtiene estadísticas de emails enviados
   */
  getStats() {
    return {
      total: this.sentEmails.length,
      byType: {
        alerts: this.sentEmails.filter(e => e.type === 'alert').length,
        daily_reports: this.sentEmails.filter(e => e.type === 'daily_report').length,
        weekly_reports: this.sentEmails.filter(e => e.type === 'weekly_report').length,
        notifications: this.sentEmails.filter(e => e.type === 'notification').length
      },
      lastSent: this.sentEmails[this.sentEmails.length - 1] || null
    };
  }
}

export default EmailAutomation;

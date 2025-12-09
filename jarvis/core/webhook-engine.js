// core/webhook-engine.js
// J.A.R.V.I.S. Webhook Engine
// Sistema de webhooks para recibir eventos de sistemas externos

import express from 'express';
import crypto from 'crypto';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

class WebhookEngine {
  constructor(jarvis) {
    this.jarvis = jarvis;
    this.app = null;
    this.server = null;
    this.webhooks = new Map();
    this.config = {
      port: parseInt(process.env.WEBHOOK_PORT) || 3001,
      secret: process.env.WEBHOOK_SECRET || 'jarvis-webhook-secret',
      rateLimit: parseInt(process.env.WEBHOOK_RATE_LIMIT) || 100, // requests per minute
      enableSecurity: process.env.WEBHOOK_SECURITY !== 'false',
      allowedIPs: process.env.WEBHOOK_ALLOWED_IPS?.split(',') || []
    };
    this.requestLog = [];
    this.running = false;
  }

  /**
   * Inicializa el motor de webhooks
   */
  async initialize() {
    console.log('🔧 [Webhook] Inicializando motor de webhooks...');

    try {
      // Crear aplicación Express
      this.app = express();

      // Middleware
      this.app.use(express.json({ limit: '10mb' }));
      this.app.use(express.urlencoded({ extended: true, limit: '10mb' }));

      // IP Whitelist middleware (si está configurado)
      if (this.config.allowedIPs.length > 0) {
        this.app.use((req, res, next) => {
          const clientIP = req.ip || req.connection.remoteAddress;
          if (!this.config.allowedIPs.includes(clientIP)) {
            console.log(`⚠️  [Webhook] IP no autorizada: ${clientIP}`);
            return res.status(403).json({ error: 'Forbidden' });
          }
          next();
        });
      }

      // Rate limiting middleware
      this.setupRateLimiting();

      // Rutas principales
      this.setupRoutes();

      // Webhooks predefinidos
      this.registerDefaultWebhooks();

      console.log('✅ [Webhook] Motor de webhooks inicializado');
      console.log(`   📡 Puerto: ${this.config.port}`);
      console.log(`   🔒 Seguridad: ${this.config.enableSecurity ? 'Activada' : 'Desactivada'}`);

      return true;
    } catch (error) {
      console.error('❌ [Webhook] Error inicializando:', error.message);
      return false;
    }
  }

  /**
   * Configura rate limiting
   */
  setupRateLimiting() {
    const requestCounts = new Map();

    this.app.use((req, res, next) => {
      const clientIP = req.ip || req.connection.remoteAddress;
      const now = Date.now();
      const windowMs = 60000; // 1 minuto

      if (!requestCounts.has(clientIP)) {
        requestCounts.set(clientIP, []);
      }

      const requests = requestCounts.get(clientIP);
      // Limpiar requests antiguos
      const recentRequests = requests.filter(time => now - time < windowMs);

      if (recentRequests.length >= this.config.rateLimit) {
        console.log(`⚠️  [Webhook] Rate limit excedido: ${clientIP}`);
        return res.status(429).json({ error: 'Rate limit exceeded' });
      }

      recentRequests.push(now);
      requestCounts.set(clientIP, recentRequests);

      next();
    });
  }

  /**
   * Configura rutas principales
   */
  setupRoutes() {
    // Health check
    this.app.get('/health', (req, res) => {
      res.json({
        status: 'ok',
        uptime: process.uptime(),
        webhooks: this.webhooks.size,
        requests: this.requestLog.length
      });
    });

    // Listar webhooks
    this.app.get('/webhooks', (req, res) => {
      const list = Array.from(this.webhooks.keys()).map(id => ({
        id,
        ...this.webhooks.get(id)
      }));
      res.json({ webhooks: list });
    });

    // Webhook genérico
    this.app.post('/webhook/:id', async (req, res) => {
      const webhookId = req.params.id;

      if (!this.webhooks.has(webhookId)) {
        return res.status(404).json({ error: 'Webhook not found' });
      }

      try {
        // Validar signature (si está habilitada)
        if (this.config.enableSecurity) {
          const signature = req.headers['x-hub-signature-256'] || req.headers['x-jarvis-signature'];
          if (!this.validateSignature(req.body, signature)) {
            console.log(`⚠️  [Webhook] Firma inválida para webhook: ${webhookId}`);
            return res.status(401).json({ error: 'Invalid signature' });
          }
        }

        // Ejecutar webhook
        const result = await this.executeWebhook(webhookId, req.body, req.headers);

        // Log
        this.logRequest(webhookId, req.body, result);

        res.json({ success: true, result });
      } catch (error) {
        console.error(`❌ [Webhook] Error ejecutando webhook ${webhookId}:`, error.message);
        res.status(500).json({ error: error.message });
      }
    });

    // GitHub webhook específico
    this.app.post('/github', async (req, res) => {
      try {
        const event = req.headers['x-github-event'];

        // Validar signature de GitHub
        if (this.config.enableSecurity) {
          const signature = req.headers['x-hub-signature-256'];
          if (!this.validateGitHubSignature(req.body, signature)) {
            return res.status(401).json({ error: 'Invalid signature' });
          }
        }

        // Procesar evento
        await this.handleGitHubEvent(event, req.body);

        res.json({ success: true });
      } catch (error) {
        console.error(`❌ [Webhook] Error en webhook GitHub:`, error.message);
        res.status(500).json({ error: error.message });
      }
    });

    // 404 handler
    this.app.use((req, res) => {
      res.status(404).json({ error: 'Not found' });
    });
  }

  /**
   * Registra webhooks por defecto
   */
  registerDefaultWebhooks() {
    // Webhook de ejemplo
    this.createWebhook('test', {
      name: 'Test Webhook',
      description: 'Webhook de prueba',
      action: async (data) => {
        console.log('📥 [Webhook] Test webhook received:', data);
        return { message: 'Test webhook processed' };
      }
    });

    // Webhook de notificación
    this.createWebhook('notify', {
      name: 'Notification Webhook',
      description: 'Recibe notificaciones externas',
      action: async (data) => {
        console.log(`🔔 [Webhook] Notificación: ${data.message}`);

        // Si tiene email, enviar alerta
        if (this.jarvis && this.jarvis.email && data.message) {
          await this.jarvis.email.sendAlert(
            data.title || 'Notificación externa',
            data.message,
            data.details || ''
          );
        }

        return { notified: true };
      }
    });

    // Webhook de comando
    this.createWebhook('command', {
      name: 'Command Webhook',
      description: 'Ejecuta comandos de JARVIS remotamente',
      action: async (data) => {
        if (!data.command) {
          throw new Error('No command provided');
        }

        console.log(`⚡ [Webhook] Ejecutando comando: ${data.command}`);

        // Ejecutar comando a través de JARVIS (si está disponible)
        if (this.jarvis && this.jarvis.processCommand) {
          const result = await this.jarvis.processCommand(data.command);
          return { command: data.command, result };
        }

        return { error: 'JARVIS not available' };
      }
    });
  }

  /**
   * Inicia el servidor de webhooks
   */
  start() {
    if (this.running) {
      console.log('⚠️  [Webhook] Servidor ya está corriendo');
      return;
    }

    this.server = this.app.listen(this.config.port, () => {
      console.log(`🚀 [Webhook] Servidor iniciado en puerto ${this.config.port}`);
      console.log(`   📡 http://localhost:${this.config.port}`);
      this.running = true;
    });

    this.server.on('error', (error) => {
      if (error.code === 'EADDRINUSE') {
        console.error(`❌ [Webhook] Puerto ${this.config.port} ya está en uso`);
      } else {
        console.error('❌ [Webhook] Error en servidor:', error.message);
      }
      this.running = false;
    });
  }

  /**
   * Detiene el servidor
   */
  stop() {
    if (!this.running || !this.server) {
      console.log('⚠️  [Webhook] Servidor no está corriendo');
      return;
    }

    this.server.close(() => {
      console.log('🛑 [Webhook] Servidor detenido');
      this.running = false;
    });
  }

  // ═════════════════════════════════════════════════════════════
  // GESTIÓN DE WEBHOOKS
  // ═════════════════════════════════════════════════════════════

  /**
   * Crea un nuevo webhook
   */
  createWebhook(id, options) {
    if (this.webhooks.has(id)) {
      throw new Error(`Webhook ${id} ya existe`);
    }

    const webhook = {
      id,
      name: options.name || id,
      description: options.description || '',
      action: options.action,
      createdAt: new Date(),
      executions: 0
    };

    this.webhooks.set(id, webhook);

    console.log(`✅ [Webhook] Webhook creado: ${id} (${webhook.name})`);

    return webhook;
  }

  /**
   * Ejecuta un webhook
   */
  async executeWebhook(id, data, headers = {}) {
    const webhook = this.webhooks.get(id);

    if (!webhook) {
      throw new Error(`Webhook ${id} no encontrado`);
    }

    console.log(`⚡ [Webhook] Ejecutando webhook: ${id}`);

    try {
      const result = await webhook.action(data, headers);
      webhook.executions++;
      webhook.lastExecution = new Date();

      return result;
    } catch (error) {
      throw new Error(`Error ejecutando webhook ${id}: ${error.message}`);
    }
  }

  /**
   * Elimina un webhook
   */
  deleteWebhook(id) {
    if (!this.webhooks.has(id)) {
      throw new Error(`Webhook ${id} no encontrado`);
    }

    this.webhooks.delete(id);
    console.log(`🗑️  [Webhook] Webhook eliminado: ${id}`);

    return true;
  }

  /**
   * Lista todos los webhooks
   */
  listWebhooks() {
    return Array.from(this.webhooks.entries()).map(([id, webhook]) => ({
      id,
      name: webhook.name,
      description: webhook.description,
      executions: webhook.executions,
      createdAt: webhook.createdAt,
      lastExecution: webhook.lastExecution
    }));
  }

  // ═════════════════════════════════════════════════════════════
  // EVENTOS DE GITHUB
  // ═════════════════════════════════════════════════════════════

  /**
   * Maneja eventos de GitHub
   */
  async handleGitHubEvent(event, payload) {
    console.log(`📥 [Webhook] Evento GitHub: ${event}`);

    switch (event) {
      case 'push':
        return this.handlePushEvent(payload);

      case 'pull_request':
        return this.handlePullRequestEvent(payload);

      case 'issues':
        return this.handleIssuesEvent(payload);

      case 'issue_comment':
        return this.handleIssueCommentEvent(payload);

      default:
        console.log(`⚠️  [Webhook] Evento GitHub no manejado: ${event}`);
        return { handled: false };
    }
  }

  /**
   * Maneja evento push
   */
  async handlePushEvent(payload) {
    const { repository, ref, commits, pusher } = payload;

    console.log(`📤 [GitHub Push] ${commits.length} commit(s) en ${ref}`);
    console.log(`   Repo: ${repository.full_name}`);
    console.log(`   Pusher: ${pusher.name}`);

    // Analizar commits
    for (const commit of commits) {
      console.log(`   - ${commit.message}`);

      // Detectar keywords críticos
      if (commit.message.match(/\b(fix|bug|critical|urgent)\b/i)) {
        // Alertar sobre commit crítico
        if (this.jarvis && this.jarvis.email) {
          await this.jarvis.email.sendAlert(
            `Commit crítico en ${repository.name}`,
            `${pusher.name} hizo push de un commit crítico`,
            `<p><strong>Mensaje:</strong> ${commit.message}</p>
             <p><strong>URL:</strong> <a href="${commit.url}">${commit.url}</a></p>`
          );
        }
      }
    }

    return { handled: true, commits: commits.length };
  }

  /**
   * Maneja evento pull_request
   */
  async handlePullRequestEvent(payload) {
    const { action, pull_request, repository } = payload;

    console.log(`🔀 [GitHub PR] PR #${pull_request.number} ${action}`);
    console.log(`   Repo: ${repository.full_name}`);
    console.log(`   Título: ${pull_request.title}`);

    // Notificar sobre PR nuevo
    if (action === 'opened' && this.jarvis && this.jarvis.email) {
      await this.jarvis.email.sendNotification(
        `Nuevo Pull Request #${pull_request.number}`,
        `${pull_request.user.login} abrió un pull request`,
        `<p><strong>Título:</strong> ${pull_request.title}</p>
         <p><strong>URL:</strong> <a href="${pull_request.html_url}">${pull_request.html_url}</a></p>`
      );
    }

    return { handled: true, action };
  }

  /**
   * Maneja evento issues
   */
  async handleIssuesEvent(payload) {
    const { action, issue, repository } = payload;

    console.log(`🐛 [GitHub Issues] Issue #${issue.number} ${action}`);
    console.log(`   Repo: ${repository.full_name}`);
    console.log(`   Título: ${issue.title}`);

    // Alertar sobre issues críticas
    const isCritical = issue.labels.some(l =>
      ['critical', 'urgent', 'bug', 'priority-high'].includes(l.name.toLowerCase())
    );

    if (isCritical && this.jarvis && this.jarvis.email) {
      await this.jarvis.email.alertCriticalIssue({
        number: issue.number,
        title: issue.title,
        author: issue.user.login,
        labels: issue.labels.map(l => l.name),
        comments: issue.comments,
        url: issue.html_url
      });
    }

    return { handled: true, action, critical: isCritical };
  }

  /**
   * Maneja evento issue_comment
   */
  async handleIssueCommentEvent(payload) {
    const { action, issue, comment } = payload;

    console.log(`💬 [GitHub Comment] Comentario en issue #${issue.number}`);
    console.log(`   Usuario: ${comment.user.login}`);

    return { handled: true, action };
  }

  // ═════════════════════════════════════════════════════════════
  // SEGURIDAD
  // ═════════════════════════════════════════════════════════════

  /**
   * Valida signature genérica
   */
  validateSignature(payload, signature) {
    if (!signature) return false;

    const expectedSignature = crypto
      .createHmac('sha256', this.config.secret)
      .update(JSON.stringify(payload))
      .digest('hex');

    return signature === `sha256=${expectedSignature}`;
  }

  /**
   * Valida signature de GitHub
   */
  validateGitHubSignature(payload, signature) {
    if (!signature) return false;

    const expectedSignature = crypto
      .createHmac('sha256', this.config.secret)
      .update(JSON.stringify(payload))
      .digest('hex');

    return signature === `sha256=${expectedSignature}`;
  }

  // ═════════════════════════════════════════════════════════════
  // LOGGING
  // ═════════════════════════════════════════════════════════════

  /**
   * Registra request en log
   */
  logRequest(webhookId, data, result) {
    const logEntry = {
      webhookId,
      timestamp: new Date(),
      dataSize: JSON.stringify(data).length,
      success: !!result,
      result
    };

    this.requestLog.push(logEntry);

    // Mantener solo últimos 1000 logs
    if (this.requestLog.length > 1000) {
      this.requestLog = this.requestLog.slice(-1000);
    }
  }

  /**
   * Obtiene estadísticas
   */
  getStats() {
    return {
      running: this.running,
      port: this.config.port,
      webhooks: this.webhooks.size,
      totalRequests: this.requestLog.length,
      requestsByWebhook: this.calculateRequestsByWebhook(),
      uptime: this.running ? process.uptime() : 0
    };
  }

  calculateRequestsByWebhook() {
    const counts = {};
    for (const log of this.requestLog) {
      counts[log.webhookId] = (counts[log.webhookId] || 0) + 1;
    }
    return counts;
  }
}

export default WebhookEngine;

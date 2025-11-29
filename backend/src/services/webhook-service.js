/**
 * Sistema de Webhooks
 * Gestiona webhooks salientes con retry, rate limiting y logging
 *
 * @module WebhookService
 * @version 2.1.0
 */

const axios = require('axios');
const crypto = require('crypto');
const EventEmitter = require('events');

/**
 * Servicio de webhooks
 */
class WebhookService extends EventEmitter {
  constructor() {
    super();

    this.config = {
      timeout: 10000, // 10 segundos
      retryAttempts: 3,
      retryDelay: 5000, // 5 segundos
      retryBackoff: 2, // Multiplicador exponencial
      maxConcurrent: 10,
      rateLimit: {
        enabled: true,
        maxPerMinute: 60
      },
      security: {
        signRequests: true,
        algorithm: 'sha256',
        secretKey: process.env.WEBHOOK_SECRET_KEY || crypto.randomBytes(32).toString('hex')
      },
      logging: {
        enabled: true,
        maxLogSize: 1000
      }
    };

    this.webhooks = new Map(); // URL -> config
    this.queue = [];
    this.processing = new Set();
    this.deliveryLog = [];
    this.stats = {
      sent: 0,
      failed: 0,
      retried: 0,
      pending: 0
    };
    this.rateLimiter = {
      counts: new Map(),
      resetInterval: null
    };
  }

  /**
   * Inicializa el servicio
   */
  async initialize() {
    try {
      console.log('🔗 Iniciando servicio de webhooks...');

      // Iniciar procesador de cola
      this.startQueueProcessor();

      // Iniciar rate limiter
      this.startRateLimiter();

      console.log('✅ Servicio de webhooks inicializado');
      this.emit('initialized');

      return true;
    } catch (error) {
      console.error('❌ Error inicializando servicio de webhooks:', error);
      throw error;
    }
  }

  /**
   * Registra un webhook
   *
   * @param {Object} options - Configuración del webhook
   * @param {string} options.name - Nombre único del webhook
   * @param {string} options.url - URL de destino
   * @param {string[]} options.events - Eventos que disparan el webhook
   * @param {Object} [options.headers] - Headers HTTP personalizados
   * @param {boolean} [options.enabled] - Si está activo (default: true)
   * @param {string} [options.secret] - Secret key personalizado
   * @returns {string} Nombre del webhook
   */
  register(options) {
    const {
      name,
      url,
      events,
      headers = {},
      enabled = true,
      secret = null,
      retryAttempts = this.config.retryAttempts,
      timeout = this.config.timeout
    } = options;

    if (!name) throw new Error('Nombre de webhook requerido');
    if (!url) throw new Error('URL requerida');
    if (!events || !Array.isArray(events) || events.length === 0) {
      throw new Error('Eventos requeridos');
    }

    // Validar URL
    try {
      new URL(url);
    } catch (error) {
      throw new Error('URL inválida');
    }

    const webhookConfig = {
      name,
      url,
      events,
      headers,
      enabled,
      secret: secret || this.config.security.secretKey,
      retryAttempts,
      timeout,
      createdAt: Date.now(),
      stats: {
        sent: 0,
        failed: 0,
        lastSent: null,
        lastError: null
      }
    };

    this.webhooks.set(name, webhookConfig);

    console.log(`✅ Webhook registrado: ${name} -> ${url}`);
    this.emit('webhook:registered', webhookConfig);

    return name;
  }

  /**
   * Elimina un webhook
   */
  unregister(name) {
    const webhook = this.webhooks.get(name);
    if (!webhook) {
      throw new Error(`Webhook no encontrado: ${name}`);
    }

    this.webhooks.delete(name);

    console.log(`❌ Webhook eliminado: ${name}`);
    this.emit('webhook:unregistered', { name });

    return true;
  }

  /**
   * Actualiza configuración de webhook
   */
  update(name, updates) {
    const webhook = this.webhooks.get(name);
    if (!webhook) {
      throw new Error(`Webhook no encontrado: ${name}`);
    }

    const updatedWebhook = {
      ...webhook,
      ...updates,
      updatedAt: Date.now()
    };

    this.webhooks.set(name, updatedWebhook);

    console.log(`🔄 Webhook actualizado: ${name}`);
    this.emit('webhook:updated', updatedWebhook);

    return updatedWebhook;
  }

  /**
   * Dispara un evento que puede activar webhooks
   *
   * @param {string} event - Nombre del evento
   * @param {Object} payload - Datos del evento
   * @param {Object} [options] - Opciones adicionales
   */
  async trigger(event, payload, options = {}) {
    try {
      // Encontrar webhooks que escuchan este evento
      const webhooksToTrigger = Array.from(this.webhooks.values())
        .filter(w => w.enabled && w.events.includes(event));

      if (webhooksToTrigger.length === 0) {
        console.log(`ℹ️  No hay webhooks registrados para evento: ${event}`);
        return { triggered: 0 };
      }

      console.log(`🔔 Disparando ${webhooksToTrigger.length} webhooks para evento: ${event}`);

      // Preparar datos del webhook
      const webhookData = {
        event,
        payload,
        timestamp: Date.now(),
        id: this.generateId()
      };

      // Agregar a cola para cada webhook
      const promises = webhooksToTrigger.map(webhook =>
        this.enqueue(webhook, webhookData, options)
      );

      await Promise.all(promises);

      this.emit('event:triggered', { event, payload, webhooks: webhooksToTrigger.length });

      return { triggered: webhooksToTrigger.length };
    } catch (error) {
      console.error('Error disparando webhooks:', error);
      throw error;
    }
  }

  /**
   * Agrega webhook a la cola
   */
  async enqueue(webhook, data, options = {}) {
    const queueItem = {
      webhook,
      data,
      options,
      attempts: 0,
      enqueuedAt: Date.now(),
      id: this.generateId()
    };

    this.queue.push(queueItem);
    this.stats.pending = this.queue.length;

    this.emit('webhook:enqueued', queueItem);

    return queueItem.id;
  }

  /**
   * Inicia procesador de cola
   */
  startQueueProcessor() {
    setInterval(async () => {
      await this.processQueue();
    }, 100); // Procesar cada 100ms
  }

  /**
   * Procesa la cola de webhooks
   */
  async processQueue() {
    // Verificar límite de concurrencia
    if (this.processing.size >= this.config.maxConcurrent) {
      return;
    }

    // Verificar si hay items en cola
    if (this.queue.length === 0) {
      return;
    }

    // Tomar siguiente item
    const item = this.queue.shift();
    this.stats.pending = this.queue.length;

    // Marcar como procesando
    this.processing.add(item.id);

    try {
      await this.sendWebhook(item);
    } catch (error) {
      console.error('Error procesando webhook:', error);
    } finally {
      this.processing.delete(item.id);
    }
  }

  /**
   * Envía webhook
   */
  async sendWebhook(item) {
    const { webhook, data, options, attempts } = item;

    try {
      // Verificar rate limit
      if (!this.checkRateLimit(webhook.name)) {
        // Reencolar
        this.queue.push({ ...item, attempts: attempts + 1 });
        return;
      }

      // Preparar request
      const requestData = {
        ...data,
        webhook: {
          name: webhook.name,
          attempt: attempts + 1
        }
      };

      // Calcular firma
      const signature = this.signPayload(requestData, webhook.secret);

      // Headers
      const headers = {
        'Content-Type': 'application/json',
        'User-Agent': 'SYSME-POS-Webhook/2.1',
        'X-Webhook-Signature': signature,
        'X-Webhook-Event': data.event,
        'X-Webhook-Id': data.id,
        'X-Webhook-Timestamp': data.timestamp.toString(),
        ...webhook.headers
      };

      // Enviar request
      const startTime = Date.now();
      const response = await axios.post(webhook.url, requestData, {
        headers,
        timeout: webhook.timeout,
        validateStatus: (status) => status >= 200 && status < 300
      });

      const duration = Date.now() - startTime;

      // Éxito
      this.stats.sent++;
      webhook.stats.sent++;
      webhook.stats.lastSent = Date.now();

      // Logging
      this.logDelivery({
        id: item.id,
        webhook: webhook.name,
        event: data.event,
        status: 'success',
        statusCode: response.status,
        duration,
        attempts: attempts + 1,
        timestamp: Date.now()
      });

      console.log(`✅ Webhook enviado: ${webhook.name} (${duration}ms)`);
      this.emit('webhook:sent', { webhook: webhook.name, data, response, duration });

      return true;
    } catch (error) {
      // Error
      console.error(`❌ Error enviando webhook ${webhook.name}:`, error.message);

      const shouldRetry = attempts < webhook.retryAttempts;

      if (shouldRetry) {
        // Reintentar con backoff exponencial
        const delay = this.config.retryDelay * Math.pow(this.config.retryBackoff, attempts);

        setTimeout(() => {
          this.queue.push({ ...item, attempts: attempts + 1 });
          this.stats.retried++;
        }, delay);

        console.log(`🔄 Reintentando webhook ${webhook.name} en ${delay}ms (intento ${attempts + 2}/${webhook.retryAttempts})`);
      } else {
        // Fallo definitivo
        this.stats.failed++;
        webhook.stats.failed++;
        webhook.stats.lastError = {
          message: error.message,
          timestamp: Date.now()
        };

        // Logging
        this.logDelivery({
          id: item.id,
          webhook: webhook.name,
          event: data.event,
          status: 'failed',
          error: error.message,
          attempts: attempts + 1,
          timestamp: Date.now()
        });

        this.emit('webhook:failed', { webhook: webhook.name, data, error });
      }

      return false;
    }
  }

  /**
   * Verifica rate limit
   */
  checkRateLimit(webhookName) {
    if (!this.config.rateLimit.enabled) return true;

    const now = Date.now();
    const windowStart = now - 60000; // Último minuto

    if (!this.rateLimiter.counts.has(webhookName)) {
      this.rateLimiter.counts.set(webhookName, []);
    }

    const requests = this.rateLimiter.counts.get(webhookName);

    // Filtrar requests del último minuto
    const recentRequests = requests.filter(timestamp => timestamp > windowStart);
    this.rateLimiter.counts.set(webhookName, recentRequests);

    // Verificar límite
    if (recentRequests.length >= this.config.rateLimit.maxPerMinute) {
      console.warn(`⚠️  Rate limit alcanzado para webhook: ${webhookName}`);
      return false;
    }

    // Agregar request actual
    recentRequests.push(now);

    return true;
  }

  /**
   * Inicia rate limiter
   */
  startRateLimiter() {
    // Limpiar contadores cada minuto
    this.rateLimiter.resetInterval = setInterval(() => {
      const now = Date.now();
      const windowStart = now - 60000;

      for (const [name, requests] of this.rateLimiter.counts) {
        const recentRequests = requests.filter(timestamp => timestamp > windowStart);
        this.rateLimiter.counts.set(name, recentRequests);
      }
    }, 60000);
  }

  /**
   * Firma payload con HMAC
   */
  signPayload(payload, secret) {
    const payloadStr = JSON.stringify(payload);
    const hmac = crypto.createHmac(this.config.security.algorithm, secret);
    hmac.update(payloadStr);
    return hmac.digest('hex');
  }

  /**
   * Verifica firma de payload
   */
  verifySignature(payload, signature, secret) {
    const expectedSignature = this.signPayload(payload, secret);
    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedSignature)
    );
  }

  /**
   * Registra entrega de webhook
   */
  logDelivery(log) {
    if (!this.config.logging.enabled) return;

    this.deliveryLog.unshift(log);

    // Mantener tamaño máximo
    if (this.deliveryLog.length > this.config.logging.maxLogSize) {
      this.deliveryLog = this.deliveryLog.slice(0, this.config.logging.maxLogSize);
    }
  }

  /**
   * Obtiene historial de entregas
   */
  getDeliveryLog(options = {}) {
    const { webhookName, event, status, limit = 50 } = options;

    let logs = this.deliveryLog;

    if (webhookName) {
      logs = logs.filter(l => l.webhook === webhookName);
    }

    if (event) {
      logs = logs.filter(l => l.event === event);
    }

    if (status) {
      logs = logs.filter(l => l.status === status);
    }

    return logs.slice(0, limit);
  }

  /**
   * Obtiene estadísticas de webhook
   */
  getWebhookStats(name) {
    const webhook = this.webhooks.get(name);
    if (!webhook) {
      throw new Error(`Webhook no encontrado: ${name}`);
    }

    const recentLogs = this.getDeliveryLog({ webhookName: name, limit: 100 });

    const successRate = webhook.stats.sent > 0
      ? (webhook.stats.sent / (webhook.stats.sent + webhook.stats.failed)) * 100
      : 0;

    const avgDuration = recentLogs.length > 0
      ? recentLogs
          .filter(l => l.duration)
          .reduce((sum, l) => sum + l.duration, 0) / recentLogs.length
      : 0;

    return {
      name: webhook.name,
      url: webhook.url,
      enabled: webhook.enabled,
      events: webhook.events,
      stats: {
        ...webhook.stats,
        successRate: successRate.toFixed(2),
        avgDuration: avgDuration.toFixed(2)
      },
      recentDeliveries: recentLogs.slice(0, 10)
    };
  }

  /**
   * Obtiene estadísticas globales
   */
  getGlobalStats() {
    return {
      webhooks: {
        total: this.webhooks.size,
        enabled: Array.from(this.webhooks.values()).filter(w => w.enabled).length
      },
      deliveries: {
        sent: this.stats.sent,
        failed: this.stats.failed,
        retried: this.stats.retried,
        pending: this.stats.pending,
        processing: this.processing.size,
        queued: this.queue.length
      },
      successRate: this.stats.sent > 0
        ? ((this.stats.sent / (this.stats.sent + this.stats.failed)) * 100).toFixed(2)
        : 0
    };
  }

  /**
   * Lista todos los webhooks
   */
  list() {
    return Array.from(this.webhooks.values()).map(webhook => ({
      name: webhook.name,
      url: webhook.url,
      events: webhook.events,
      enabled: webhook.enabled,
      stats: webhook.stats
    }));
  }

  /**
   * Prueba un webhook
   */
  async test(name) {
    const webhook = this.webhooks.get(name);
    if (!webhook) {
      throw new Error(`Webhook no encontrado: ${name}`);
    }

    console.log(`🧪 Probando webhook: ${name}`);

    const testPayload = {
      event: 'test',
      payload: {
        message: 'This is a test webhook',
        timestamp: Date.now()
      },
      timestamp: Date.now(),
      id: this.generateId()
    };

    return this.enqueue(webhook, testPayload, { test: true });
  }

  /**
   * Genera ID único
   */
  generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }

  /**
   * Limpia recursos
   */
  cleanup() {
    if (this.rateLimiter.resetInterval) {
      clearInterval(this.rateLimiter.resetInterval);
    }

    this.queue = [];
    this.processing.clear();
    this.deliveryLog = [];

    console.log('✅ Servicio de webhooks limpiado');
  }
}

// Singleton
const webhookService = new WebhookService();

module.exports = webhookService;

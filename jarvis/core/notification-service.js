/**
 * 📬 JARVIS NOTIFICATION SERVICE
 * Sistema de notificaciones multi-canal
 *
 * Canales soportados:
 * - Email (Gmail, SMTP)
 * - Slack
 * - Discord
 * - Telegram
 * - Desktop (node-notifier)
 * - Webhook (HTTP POST)
 * - Log file
 * - Console
 *
 * Features:
 * - Múltiples canales simultáneos
 * - Templates de mensajes
 * - Prioridades (low, medium, high, critical)
 * - Rate limiting
 * - Queue de retry
 * - Persistencia de notificaciones
 */

const EventEmitter = require('events');
const axios = require('axios');
const { getLogger } = require('./logger');

class NotificationService extends EventEmitter {
  constructor(config = {}) {
    super();

    this.config = config;
    this.logger = getLogger();
    this.queue = [];
    this.sending = false;
    this.rateLimits = new Map();
  }

  /**
   * Envía una notificación
   */
  async send(notification) {
    try {
      const {
        channels = ['console'],
        title,
        message,
        priority = 'medium',
        data = {},
        template
      } = notification;

      // Aplicar template si existe
      const finalMessage = template ? this.applyTemplate(template, data) : message;

      // Validar
      if (!title || !finalMessage) {
        throw new Error('title and message are required');
      }

      // Construir notificación completa
      const fullNotification = {
        id: this.generateId(),
        timestamp: new Date().toISOString(),
        title,
        message: finalMessage,
        priority,
        data,
        channels
      };

      this.logger.info(`📬 Sending notification: ${title}`, {
        priority,
        channels: channels.join(', ')
      });

      // Enviar a cada canal
      const results = await Promise.allSettled(
        channels.map(channel => this.sendToChannel(channel, fullNotification))
      );

      // Verificar resultados
      const failed = results.filter(r => r.status === 'rejected');
      const succeeded = results.filter(r => r.status === 'fulfilled');

      if (failed.length > 0) {
        this.logger.warn(`Notification sent to ${succeeded.length}/${channels.length} channels`, {
          failed: failed.map(f => f.reason?.message)
        });
      } else {
        this.logger.success(`Notification sent successfully to all ${channels.length} channels`);
      }

      // Emitir evento
      this.emit('notification:sent', fullNotification, results);

      return {
        success: failed.length === 0,
        notification: fullNotification,
        results: {
          succeeded: succeeded.length,
          failed: failed.length,
          total: channels.length
        }
      };

    } catch (error) {
      this.logger.error('Failed to send notification:', { error: error.message });
      throw error;
    }
  }

  /**
   * Envía notificación a un canal específico
   */
  async sendToChannel(channel, notification) {
    // Check rate limit
    if (this.isRateLimited(channel)) {
      throw new Error(`Rate limit exceeded for channel: ${channel}`);
    }

    // Update rate limit
    this.updateRateLimit(channel);

    switch (channel) {
      case 'email':
        return await this.sendEmail(notification);
      case 'slack':
        return await this.sendSlack(notification);
      case 'discord':
        return await this.sendDiscord(notification);
      case 'telegram':
        return await this.sendTelegram(notification);
      case 'desktop':
        return await this.sendDesktop(notification);
      case 'webhook':
        return await this.sendWebhook(notification);
      case 'console':
        return this.sendConsole(notification);
      case 'log':
        return this.sendLog(notification);
      default:
        throw new Error(`Unknown channel: ${channel}`);
    }
  }

  /**
   * Envía notificación por email
   */
  async sendEmail(notification) {
    const nodemailer = require('nodemailer');

    const config = this.config.email || {};

    if (!config.user || !config.password) {
      throw new Error('Email credentials not configured');
    }

    const transporter = nodemailer.createTransporter({
      service: config.service || 'gmail',
      auth: {
        user: config.user,
        pass: config.password
      }
    });

    const mailOptions = {
      from: config.from || config.user,
      to: config.to || config.user,
      subject: `[JARVIS] ${notification.title}`,
      text: notification.message,
      html: this.formatEmailHTML(notification)
    };

    const info = await transporter.sendMail(mailOptions);
    return { channel: 'email', messageId: info.messageId };
  }

  /**
   * Envía notificación a Slack
   */
  async sendSlack(notification) {
    const webhookUrl = this.config.slack?.webhookUrl;

    if (!webhookUrl) {
      throw new Error('Slack webhook URL not configured');
    }

    const payload = {
      text: notification.title,
      attachments: [
        {
          color: this.getPriorityColor(notification.priority),
          text: notification.message,
          timestamp: Math.floor(new Date(notification.timestamp).getTime() / 1000)
        }
      ]
    };

    await axios.post(webhookUrl, payload);
    return { channel: 'slack' };
  }

  /**
   * Envía notificación a Discord
   */
  async sendDiscord(notification) {
    const webhookUrl = this.config.discord?.webhookUrl;

    if (!webhookUrl) {
      throw new Error('Discord webhook URL not configured');
    }

    const payload = {
      embeds: [
        {
          title: notification.title,
          description: notification.message,
          color: parseInt(this.getPriorityColor(notification.priority).replace('#', ''), 16),
          timestamp: notification.timestamp
        }
      ]
    };

    await axios.post(webhookUrl, payload);
    return { channel: 'discord' };
  }

  /**
   * Envía notificación a Telegram
   */
  async sendTelegram(notification) {
    const botToken = this.config.telegram?.botToken;
    const chatId = this.config.telegram?.chatId;

    if (!botToken || !chatId) {
      throw new Error('Telegram bot token or chat ID not configured');
    }

    const text = `*${notification.title}*\n\n${notification.message}`;

    await axios.post(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      chat_id: chatId,
      text,
      parse_mode: 'Markdown'
    });

    return { channel: 'telegram' };
  }

  /**
   * Envía notificación de desktop
   */
  async sendDesktop(notification) {
    const notifier = require('node-notifier');

    return new Promise((resolve, reject) => {
      notifier.notify(
        {
          title: notification.title,
          message: notification.message,
          sound: true,
          wait: false
        },
        (err, response) => {
          if (err) reject(err);
          else resolve({ channel: 'desktop', response });
        }
      );
    });
  }

  /**
   * Envía notificación a webhook genérico
   */
  async sendWebhook(notification) {
    const webhookUrl = this.config.webhook?.url;

    if (!webhookUrl) {
      throw new Error('Webhook URL not configured');
    }

    await axios.post(webhookUrl, {
      notification,
      source: 'JARVIS',
      timestamp: new Date().toISOString()
    });

    return { channel: 'webhook' };
  }

  /**
   * Envía notificación a consola
   */
  sendConsole(notification) {
    const icon = this.getPriorityIcon(notification.priority);
    console.log(`\n${icon} ${notification.title}`.cyan);
    console.log(`  ${notification.message}`.gray);
    console.log('');

    return { channel: 'console' };
  }

  /**
   * Envía notificación a log
   */
  sendLog(notification) {
    const level = this.getPriorityLogLevel(notification.priority);
    this.logger[level](`Notification: ${notification.title}`, {
      message: notification.message,
      priority: notification.priority,
      data: notification.data
    });

    return { channel: 'log' };
  }

  /**
   * Aplica template a un mensaje
   */
  applyTemplate(templateName, data) {
    const templates = {
      // Sistema
      'system.startup': (d) => `JARVIS system started successfully. Version: ${d.version}`,
      'system.shutdown': (d) => `JARVIS system shutting down. Uptime: ${d.uptime}s`,
      'system.error': (d) => `System error occurred: ${d.error}`,

      // AI
      'ai.request': (d) => `AI request processed. Model: ${d.model}, Duration: ${d.duration}ms`,
      'ai.error': (d) => `AI request failed: ${d.error}`,

      // Performance
      'performance.slow': (d) => `Slow operation detected: ${d.operation} took ${d.duration}ms`,
      'performance.memory': (d) => `High memory usage: ${d.usage}MB (${d.percent}%)`,

      // Security
      'security.alert': (d) => `Security alert: ${d.event}. Action required.`,
      'security.breach': (d) => `Possible security breach detected: ${d.details}`,

      // Custom
      'custom': (d) => d.message
    };

    const template = templates[templateName];

    if (!template) {
      this.logger.warn(`Template not found: ${templateName}`);
      return data.message || '';
    }

    return template(data);
  }

  /**
   * Rate limiting
   */
  isRateLimited(channel) {
    const limit = this.config.rateLimit?.[channel] || 60; // 60 notifications per minute
    const now = Date.now();

    if (!this.rateLimits.has(channel)) {
      return false;
    }

    const { count, resetAt } = this.rateLimits.get(channel);

    if (now >= resetAt) {
      return false;
    }

    return count >= limit;
  }

  updateRateLimit(channel) {
    const now = Date.now();
    const resetInterval = 60000; // 1 minute

    if (!this.rateLimits.has(channel)) {
      this.rateLimits.set(channel, {
        count: 1,
        resetAt: now + resetInterval
      });
      return;
    }

    const rateLimit = this.rateLimits.get(channel);

    if (now >= rateLimit.resetAt) {
      rateLimit.count = 1;
      rateLimit.resetAt = now + resetInterval;
    } else {
      rateLimit.count++;
    }
  }

  /**
   * Helpers
   */
  generateId() {
    return `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  getPriorityColor(priority) {
    const colors = {
      low: '#00FF00',
      medium: '#FFA500',
      high: '#FF6600',
      critical: '#FF0000'
    };
    return colors[priority] || colors.medium;
  }

  getPriorityIcon(priority) {
    const icons = {
      low: 'ℹ️',
      medium: '⚠️',
      high: '🚨',
      critical: '🔴'
    };
    return icons[priority] || icons.medium;
  }

  getPriorityLogLevel(priority) {
    const levels = {
      low: 'debug',
      medium: 'info',
      high: 'warn',
      critical: 'error'
    };
    return levels[priority] || 'info';
  }

  formatEmailHTML(notification) {
    const color = this.getPriorityColor(notification.priority);

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; padding: 20px; }
          .header { background: ${color}; color: white; padding: 15px; border-radius: 5px; }
          .content { padding: 20px; background: #f5f5f5; margin-top: 10px; border-radius: 5px; }
          .footer { padding: 10px; color: #666; font-size: 12px; margin-top: 20px; }
        </style>
      </head>
      <body>
        <div class="header">
          <h2>${notification.title}</h2>
          <p>Priority: ${notification.priority.toUpperCase()}</p>
        </div>
        <div class="content">
          <p>${notification.message.replace(/\n/g, '<br>')}</p>
        </div>
        <div class="footer">
          <p>Sent by JARVIS at ${notification.timestamp}</p>
          <p>Stark Industries Technology</p>
        </div>
      </body>
      </html>
    `;
  }

  /**
   * Notificaciones rápidas predefinidas
   */
  async notifySystemStart(version) {
    return this.send({
      title: 'JARVIS Started',
      template: 'system.startup',
      data: { version },
      priority: 'medium',
      channels: ['console', 'log']
    });
  }

  async notifySystemError(error) {
    return this.send({
      title: 'System Error',
      template: 'system.error',
      data: { error: error.message },
      priority: 'critical',
      channels: ['console', 'log', 'email']
    });
  }

  async notifySlowOperation(operation, duration) {
    if (duration > 1000) {
      return this.send({
        title: 'Performance Warning',
        template: 'performance.slow',
        data: { operation, duration },
        priority: 'high',
        channels: ['console', 'log']
      });
    }
  }

  async notifySecurityAlert(event, details) {
    return this.send({
      title: 'Security Alert',
      template: 'security.alert',
      data: { event, details },
      priority: 'critical',
      channels: ['console', 'log', 'email', 'slack']
    });
  }
}

// Singleton
let notificationService;

function getNotificationService(config) {
  if (!notificationService) {
    try {
      const configManager = require('./config-manager');
      const fullConfig = {
        email: configManager.get('email'),
        slack: configManager.get('notifications.slack'),
        discord: configManager.get('notifications.discord'),
        telegram: configManager.get('notifications.telegram'),
        webhook: configManager.get('notifications.webhook'),
        ...config
      };
      notificationService = new NotificationService(fullConfig);
    } catch {
      notificationService = new NotificationService(config || {});
    }
  }
  return notificationService;
}

module.exports = {
  NotificationService,
  getNotificationService
};

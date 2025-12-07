/**
 * Servicio de Notificaciones Email/SMS
 * Gestiona el envío de notificaciones multicanal con plantillas y programación
 * Soporta: Email (SendGrid/Nodemailer), SMS (Twilio), Push Notifications
 *
 * @module EmailSMSService
 * @version 2.1.0
 */

const nodemailer = require('nodemailer');
const handlebars = require('handlebars');
const fs = require('fs').promises;
const path = require('path');
const schedule = require('node-schedule');
const EventEmitter = require('events');

/**
 * Servicio principal de notificaciones Email/SMS
 */
class EmailSMSService extends EventEmitter {
  constructor() {
    super();

    this.config = {
      email: {
        provider: process.env.EMAIL_PROVIDER || 'smtp',
        smtp: {
          host: process.env.SMTP_HOST || 'smtp.gmail.com',
          port: parseInt(process.env.SMTP_PORT) || 587,
          secure: process.env.SMTP_SECURE === 'true',
          auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS
          }
        },
        sendgrid: {
          apiKey: process.env.SENDGRID_API_KEY
        },
        from: process.env.EMAIL_FROM || 'noreply@sysme.com',
        fromName: process.env.EMAIL_FROM_NAME || 'SYSME POS'
      },
      sms: {
        provider: process.env.SMS_PROVIDER || 'twilio',
        twilio: {
          accountSid: process.env.TWILIO_ACCOUNT_SID,
          authToken: process.env.TWILIO_AUTH_TOKEN,
          fromNumber: process.env.TWILIO_FROM_NUMBER
        }
      },
      push: {
        enabled: process.env.PUSH_ENABLED === 'true',
        vapidPublicKey: process.env.VAPID_PUBLIC_KEY,
        vapidPrivateKey: process.env.VAPID_PRIVATE_KEY
      },
      templatesPath: path.join(__dirname, '../templates/notifications'),
      queueEnabled: true,
      retryAttempts: 3,
      retryDelay: 5000, // 5 segundos
      rateLimits: {
        email: 100, // emails por minuto
        sms: 50 // SMS por minuto
      }
    };

    this.emailTransporter = null;
    this.smsClient = null;
    this.templates = new Map();
    this.queue = [];
    this.processing = false;
    this.scheduledJobs = new Map();
    this.stats = {
      email: { sent: 0, failed: 0, queued: 0 },
      sms: { sent: 0, failed: 0, queued: 0 },
      push: { sent: 0, failed: 0, queued: 0 }
    };
    this.rateLimiters = {
      email: { count: 0, resetAt: Date.now() + 60000 },
      sms: { count: 0, resetAt: Date.now() + 60000 }
    };
  }

  /**
   * Inicializa el servicio de notificaciones
   */
  async initialize() {
    try {
      // Inicializar transporte de email
      await this.initializeEmailTransport();

      // Inicializar cliente SMS
      await this.initializeSMSClient();

      // Cargar plantillas
      await this.loadTemplates();

      // Iniciar procesamiento de cola
      if (this.config.queueEnabled) {
        this.startQueueProcessor();
      }

      console.log('✅ Servicio de notificaciones Email/SMS inicializado correctamente');
      this.emit('initialized');

      return true;
    } catch (error) {
      console.error('❌ Error inicializando servicio de notificaciones:', error);
      throw error;
    }
  }

  /**
   * Inicializa el transporte de email
   */
  async initializeEmailTransport() {
    if (this.config.email.provider === 'sendgrid') {
      try {
        const sgMail = require('@sendgrid/mail');
        if (this.config.email.sendgrid.apiKey) {
          sgMail.setApiKey(this.config.email.sendgrid.apiKey);
          this.sendGridClient = sgMail;
          console.log('✅ SendGrid configurado');
        }
      } catch (error) {
        console.warn('⚠️  SendGrid no disponible, usando SMTP');
        this.config.email.provider = 'smtp';
      }
    }

    if (this.config.email.provider === 'smtp') {
      this.emailTransporter = nodemailer.createTransport(this.config.email.smtp);

      try {
        await this.emailTransporter.verify();
        console.log('✅ Transporte de email SMTP configurado');
      } catch (error) {
        console.warn('⚠️  SMTP no configurado:', error.message);
      }
    }
  }

  /**
   * Inicializa el cliente SMS
   */
  async initializeSMSClient() {
    if (this.config.sms.provider === 'twilio') {
      const twilioConfig = this.config.sms.twilio;

      if (twilioConfig.accountSid && twilioConfig.authToken) {
        try {
          const twilio = require('twilio');
          this.smsClient = twilio(twilioConfig.accountSid, twilioConfig.authToken);
          console.log('✅ Cliente Twilio SMS configurado');
        } catch (error) {
          console.warn('⚠️  Twilio no disponible:', error.message);
        }
      } else {
        console.warn('⚠️  Twilio no configurado (faltan credenciales)');
      }
    }
  }

  /**
   * Carga las plantillas de notificaciones
   */
  async loadTemplates() {
    try {
      // Crear directorio de plantillas si no existe
      await fs.mkdir(this.config.templatesPath, { recursive: true });

      // Cargar plantillas existentes
      const files = await fs.readdir(this.config.templatesPath);

      for (const file of files) {
        if (file.endsWith('.hbs') || file.endsWith('.html')) {
          const templateName = file.replace(/\.(hbs|html)$/, '');
          const templatePath = path.join(this.config.templatesPath, file);
          const templateContent = await fs.readFile(templatePath, 'utf-8');

          this.templates.set(templateName, handlebars.compile(templateContent));
        }
      }

      console.log(`✅ ${this.templates.size} plantillas cargadas`);

      // Crear plantillas por defecto si no existen
      await this.createDefaultTemplates();
    } catch (error) {
      console.error('Error cargando plantillas:', error);
      await this.createDefaultTemplates();
    }
  }

  /**
   * Crea plantillas por defecto
   */
  async createDefaultTemplates() {
    const defaultTemplates = {
      'welcome-email': `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #4CAF50; color: white; padding: 20px; text-align: center; }
    .content { padding: 20px; background: #f9f9f9; }
    .footer { text-align: center; padding: 20px; font-size: 12px; color: #666; }
    .button { display: inline-block; padding: 10px 20px; background: #4CAF50; color: white; text-decoration: none; border-radius: 5px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>¡Bienvenido a SYSME POS!</h1>
    </div>
    <div class="content">
      <h2>Hola {{name}},</h2>
      <p>Estamos encantados de tenerte con nosotros. Tu cuenta ha sido creada exitosamente.</p>
      <p><strong>Usuario:</strong> {{username}}</p>
      <p><strong>Rol:</strong> {{role}}</p>
      <p>Para comenzar, inicia sesión en el sistema:</p>
      <p style="text-align: center;">
        <a href="{{loginUrl}}" class="button">Iniciar Sesión</a>
      </p>
    </div>
    <div class="footer">
      <p>© {{year}} SYSME POS. Todos los derechos reservados.</p>
    </div>
  </div>
</body>
</html>`,

      'low-stock-alert': `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #ff9800; color: white; padding: 20px; text-align: center; }
    .alert { background: #fff3cd; border-left: 4px solid #ff9800; padding: 15px; margin: 20px 0; }
    .product-list { background: white; padding: 15px; }
    .product-item { border-bottom: 1px solid #ddd; padding: 10px 0; }
    .footer { text-align: center; padding: 20px; font-size: 12px; color: #666; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>⚠️ Alerta de Stock Bajo</h1>
    </div>
    <div class="alert">
      <strong>Atención:</strong> Se han detectado {{productCount}} productos con stock bajo o crítico.
    </div>
    <div class="product-list">
      <h3>Productos afectados:</h3>
      {{#each products}}
      <div class="product-item">
        <strong>{{this.name}}</strong><br>
        Stock actual: <span style="color: #d32f2f;">{{this.currentStock}}</span> /
        Stock mínimo: {{this.minStock}}<br>
        Categoría: {{this.category}}
      </div>
      {{/each}}
    </div>
    <div class="footer">
      <p>© {{year}} SYSME POS. Sistema de alertas automáticas.</p>
    </div>
  </div>
</body>
</html>`,

      'daily-sales-report': `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #2196F3; color: white; padding: 20px; text-align: center; }
    .metrics { display: flex; justify-content: space-around; padding: 20px; background: #f5f5f5; }
    .metric { text-align: center; }
    .metric-value { font-size: 24px; font-weight: bold; color: #2196F3; }
    .metric-label { font-size: 12px; color: #666; }
    .footer { text-align: center; padding: 20px; font-size: 12px; color: #666; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>📊 Reporte de Ventas Diarias</h1>
      <p>{{date}}</p>
    </div>
    <div class="metrics">
      <div class="metric">
        <div class="metric-value">{{currency}}{{totalSales}}</div>
        <div class="metric-label">Ventas Totales</div>
      </div>
      <div class="metric">
        <div class="metric-value">{{transactions}}</div>
        <div class="metric-label">Transacciones</div>
      </div>
      <div class="metric">
        <div class="metric-value">{{currency}}{{averageTicket}}</div>
        <div class="metric-label">Ticket Promedio</div>
      </div>
    </div>
    <div style="padding: 20px;">
      <h3>Resumen del día:</h3>
      <ul>
        <li>Producto más vendido: <strong>{{topProduct}}</strong></li>
        <li>Hora pico: <strong>{{peakHour}}</strong></li>
        <li>Crecimiento vs ayer: <strong style="color: {{growthColor}};">{{growth}}%</strong></li>
      </ul>
    </div>
    <div class="footer">
      <p>© {{year}} SYSME POS. Reporte automático generado.</p>
    </div>
  </div>
</body>
</html>`
    };

    for (const [name, content] of Object.entries(defaultTemplates)) {
      const templatePath = path.join(this.config.templatesPath, `${name}.hbs`);

      try {
        await fs.access(templatePath);
        // La plantilla ya existe
        this.templates.set(name, handlebars.compile(content));
      } catch {
        // Crear la plantilla
        try {
          await fs.writeFile(templatePath, content, 'utf-8');
          this.templates.set(name, handlebars.compile(content));
        } catch (err) {
          console.error(`Error creando plantilla ${name}:`, err);
          this.templates.set(name, handlebars.compile(content));
        }
      }
    }
  }

  /**
   * Envía una notificación por email
   */
  async sendEmail(options) {
    try {
      if (!options.to) throw new Error('Destinatario requerido');
      if (!options.subject) throw new Error('Asunto requerido');

      // Verificar rate limit
      if (!this.checkRateLimit('email')) {
        if (this.config.queueEnabled) {
          this.stats.email.queued++;
          return this.addToQueue('email', options);
        }
        throw new Error('Rate limit excedido para emails');
      }

      let html = options.html;
      let text = options.text;

      // Renderizar plantilla si se especifica
      if (options.template) {
        const template = this.templates.get(options.template);
        if (!template) {
          throw new Error(`Plantilla no encontrada: ${options.template}`);
        }

        const data = {
          ...options.data,
          year: new Date().getFullYear(),
          currency: '$'
        };

        html = template(data);
      }

      // Preparar email
      const mailOptions = {
        from: `"${this.config.email.fromName}" <${this.config.email.from}>`,
        to: Array.isArray(options.to) ? options.to.join(', ') : options.to,
        subject: options.subject,
        html,
        text,
        attachments: options.attachments || [],
        priority: options.priority ? 'high' : 'normal'
      };

      // Enviar email
      let result;
      if (this.sendGridClient) {
        result = await this.sendGridClient.send(mailOptions);
      } else if (this.emailTransporter) {
        result = await this.emailTransporter.sendMail(mailOptions);
      } else {
        throw new Error('No hay transporte de email configurado');
      }

      this.stats.email.sent++;
      this.emit('email:sent', { to: options.to, subject: options.subject });

      console.log(`✅ Email enviado a ${options.to}`);

      return {
        success: true,
        messageId: result.messageId,
        channel: 'email'
      };
    } catch (error) {
      this.stats.email.failed++;
      this.emit('email:failed', { to: options.to, error: error.message });

      console.error('❌ Error enviando email:', error);

      // Reintentar si está habilitado
      if (options.retry !== false && (options.retryCount || 0) < this.config.retryAttempts) {
        return this.retryNotification('email', options);
      }

      return {
        success: false,
        error: error.message,
        channel: 'email'
      };
    }
  }

  /**
   * Envía una notificación por SMS
   */
  async sendSMS(options) {
    try {
      if (!this.smsClient) {
        throw new Error('Cliente SMS no configurado');
      }

      if (!options.to) throw new Error('Número de teléfono requerido');
      if (!options.message) throw new Error('Mensaje requerido');

      // Verificar rate limit
      if (!this.checkRateLimit('sms')) {
        if (this.config.queueEnabled) {
          this.stats.sms.queued++;
          return this.addToQueue('sms', options);
        }
        throw new Error('Rate limit excedido para SMS');
      }

      const recipients = Array.isArray(options.to) ? options.to : [options.to];
      const results = [];

      for (const phoneNumber of recipients) {
        const result = await this.smsClient.messages.create({
          body: options.message,
          from: this.config.sms.twilio.fromNumber,
          to: phoneNumber
        });

        results.push(result);
      }

      this.stats.sms.sent += recipients.length;
      this.emit('sms:sent', { to: options.to, message: options.message });

      console.log(`✅ SMS enviado a ${recipients.join(', ')}`);

      return {
        success: true,
        results,
        channel: 'sms'
      };
    } catch (error) {
      this.stats.sms.failed++;
      this.emit('sms:failed', { to: options.to, error: error.message });

      console.error('❌ Error enviando SMS:', error);

      if (options.retry !== false && (options.retryCount || 0) < this.config.retryAttempts) {
        return this.retryNotification('sms', options);
      }

      return {
        success: false,
        error: error.message,
        channel: 'sms'
      };
    }
  }

  /**
   * Programa una notificación recurrente
   */
  scheduleNotification(options) {
    const { name, schedule: scheduleExpression, channel, notification } = options;

    if (this.scheduledJobs.has(name)) {
      this.cancelScheduledNotification(name);
    }

    const job = schedule.scheduleJob(scheduleExpression, async () => {
      console.log(`⏰ Ejecutando notificación programada: ${name}`);

      try {
        if (channel === 'email') {
          await this.sendEmail(notification);
        } else if (channel === 'sms') {
          await this.sendSMS(notification);
        }
      } catch (error) {
        console.error(`Error en notificación programada ${name}:`, error);
      }
    });

    this.scheduledJobs.set(name, job);
    console.log(`✅ Notificación programada: ${name} (${scheduleExpression})`);

    return name;
  }

  cancelScheduledNotification(name) {
    const job = this.scheduledJobs.get(name);
    if (job) {
      job.cancel();
      this.scheduledJobs.delete(name);
      console.log(`❌ Notificación programada cancelada: ${name}`);
      return true;
    }
    return false;
  }

  checkRateLimit(channel) {
    const limiter = this.rateLimiters[channel];
    const now = Date.now();

    if (now >= limiter.resetAt) {
      limiter.count = 0;
      limiter.resetAt = now + 60000;
    }

    const limit = this.config.rateLimits[channel];
    if (limiter.count >= limit) {
      return false;
    }

    limiter.count++;
    return true;
  }

  addToQueue(channel, options) {
    this.queue.push({
      channel,
      options,
      addedAt: Date.now(),
      retryCount: options.retryCount || 0
    });

    return {
      success: true,
      queued: true,
      channel
    };
  }

  startQueueProcessor() {
    setInterval(async () => {
      if (this.processing || this.queue.length === 0) {
        return;
      }

      this.processing = true;

      try {
        const item = this.queue.shift();
        const { channel, options } = item;

        if (channel === 'email') {
          await this.sendEmail(options);
        } else if (channel === 'sms') {
          await this.sendSMS(options);
        }
      } catch (error) {
        console.error('Error procesando cola:', error);
      } finally {
        this.processing = false;
      }
    }, 1000);
  }

  async retryNotification(channel, options) {
    const retryCount = (options.retryCount || 0) + 1;

    console.log(`🔄 Reintentando notificación (intento ${retryCount}/${this.config.retryAttempts})`);

    await new Promise(resolve => setTimeout(resolve, this.config.retryDelay));

    const retryOptions = {
      ...options,
      retryCount
    };

    if (channel === 'email') {
      return this.sendEmail(retryOptions);
    } else if (channel === 'sms') {
      return this.sendSMS(retryOptions);
    }
  }

  getStats() {
    return {
      ...this.stats,
      queue: {
        size: this.queue.length,
        processing: this.processing
      },
      scheduledJobs: Array.from(this.scheduledJobs.keys()),
      rateLimiters: this.rateLimiters
    };
  }

  async cleanup() {
    for (const [name, job] of this.scheduledJobs) {
      job.cancel();
    }
    this.scheduledJobs.clear();

    if (this.emailTransporter && typeof this.emailTransporter.close === 'function') {
      this.emailTransporter.close();
    }
    this.emailTransporter = null;

    console.log('✅ Servicio de notificaciones Email/SMS limpiado');
  }
}

// Singleton
const emailSMSService = new EmailSMSService();

module.exports = emailSMSService;

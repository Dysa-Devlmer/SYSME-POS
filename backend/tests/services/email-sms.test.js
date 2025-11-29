/**
 * Pruebas Unitarias - Email/SMS Service
 * @jest-environment node
 */

const emailSMSService = require('../../src/services/email-sms-service');

describe('Email/SMS Service', () => {
  beforeAll(async () => {
    // Mock de configuración para evitar dependencias externas
    emailSMSService.config.email.provider = 'mock';
    emailSMSService.emailTransporter = {
      sendMail: jest.fn().mockResolvedValue({ messageId: 'test-123' })
    };
  });

  afterAll(async () => {
    await emailSMSService.cleanup();
  });

  describe('Initialization', () => {
    test('should have templates loaded', () => {
      expect(emailSMSService.templates.size).toBeGreaterThanOrEqual(4);
    });

    test('should have default configuration', () => {
      expect(emailSMSService.config).toBeDefined();
      expect(emailSMSService.config.retryAttempts).toBe(3);
    });
  });

  describe('Template Management', () => {
    test('should have welcome-email template', () => {
      expect(emailSMSService.templates.has('welcome-email')).toBe(true);
    });

    test('should have low-stock-alert template', () => {
      expect(emailSMSService.templates.has('low-stock-alert')).toBe(true);
    });

    test('should compile templates correctly', () => {
      const template = emailSMSService.templates.get('welcome-email');
      expect(template).toBeDefined();
      expect(typeof template).toBe('function');
    });
  });

  describe('Email Sending', () => {
    test('should send email with template', async () => {
      const result = await emailSMSService.sendEmail({
        to: 'test@example.com',
        subject: 'Test Email',
        template: 'welcome-email',
        data: {
          name: 'Test User',
          username: 'testuser',
          role: 'admin',
          loginUrl: 'http://localhost:3000'
        }
      });

      expect(result.success).toBe(true);
      expect(result.channel).toBe('email');
    });

    test('should fail without required fields', async () => {
      const result = await emailSMSService.sendEmail({
        subject: 'Test'
      });

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    test('should handle multiple recipients', async () => {
      const result = await emailSMSService.sendEmail({
        to: ['test1@example.com', 'test2@example.com'],
        subject: 'Test Email',
        html: '<p>Test</p>'
      });

      expect(result.success).toBe(true);
    });
  });

  describe('Rate Limiting', () => {
    test('should check rate limit for email', () => {
      const allowed = emailSMSService.checkRateLimit('email');
      expect(typeof allowed).toBe('boolean');
    });

    test('should have rate limiters configured', () => {
      expect(emailSMSService.rateLimiters.email).toBeDefined();
      expect(emailSMSService.rateLimiters.sms).toBeDefined();
    });
  });

  describe('Queue Management', () => {
    test('should add to queue when rate limited', async () => {
      // Simular rate limit excedido
      emailSMSService.rateLimiters.email.count = 1000;

      const result = await emailSMSService.sendEmail({
        to: 'test@example.com',
        subject: 'Test',
        html: '<p>Test</p>'
      });

      expect(result.queued).toBe(true);

      // Reset
      emailSMSService.rateLimiters.email.count = 0;
    });

    test('should have queue array', () => {
      expect(Array.isArray(emailSMSService.queue)).toBe(true);
    });
  });

  describe('Statistics', () => {
    test('should return statistics', () => {
      const stats = emailSMSService.getStats();

      expect(stats).toBeDefined();
      expect(stats.email).toBeDefined();
      expect(stats.sms).toBeDefined();
      expect(stats.queue).toBeDefined();
    });

    test('should track sent count', () => {
      const stats = emailSMSService.getStats();
      expect(typeof stats.email.sent).toBe('number');
    });
  });

  describe('Scheduled Notifications', () => {
    test('should schedule notification', () => {
      const jobName = emailSMSService.scheduleNotification({
        name: 'test-job',
        schedule: '0 0 * * *',
        channel: 'email',
        notification: {
          to: 'test@example.com',
          subject: 'Daily Report',
          html: '<p>Report</p>'
        }
      });

      expect(jobName).toBe('test-job');
      expect(emailSMSService.scheduledJobs.has('test-job')).toBe(true);
    });

    test('should cancel scheduled notification', () => {
      const cancelled = emailSMSService.cancelScheduledNotification('test-job');
      expect(cancelled).toBe(true);
      expect(emailSMSService.scheduledJobs.has('test-job')).toBe(false);
    });
  });
});

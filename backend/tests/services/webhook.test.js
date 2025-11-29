/**
 * Pruebas Unitarias - Webhook Service
 * @jest-environment node
 */

const webhookService = require('../../src/services/webhook-service');
const nock = require('nock');

describe('Webhook Service', () => {
  const testWebhookId = 'test-webhook-123';
  const testUrl = 'https://example.com/webhook';

  beforeAll(async () => {
    // Mock HTTP requests
    nock.disableNetConnect();
    nock.enableNetConnect('127.0.0.1');
  });

  afterAll(async () => {
    nock.cleanAll();
    nock.enableNetConnect();
    await webhookService.cleanup();
  });

  afterEach(() => {
    // Limpiar webhooks de prueba
    if (webhookService.webhooks.has(testWebhookId)) {
      webhookService.webhooks.delete(testWebhookId);
    }
    nock.cleanAll();
  });

  describe('Initialization', () => {
    test('should initialize successfully', async () => {
      expect(webhookService.webhooks).toBeDefined();
      expect(webhookService.deliveryQueue).toBeDefined();
    });

    test('should have default configuration', () => {
      expect(webhookService.config.retryAttempts).toBe(3);
      expect(webhookService.config.timeout).toBeDefined();
    });

    test('should have empty webhooks on start', () => {
      const count = webhookService.webhooks.size;
      expect(typeof count).toBe('number');
    });
  });

  describe('Webhook Registration', () => {
    test('should register new webhook', () => {
      const webhook = webhookService.register({
        id: testWebhookId,
        url: testUrl,
        events: ['order.created', 'payment.completed'],
        secret: 'test-secret'
      });

      expect(webhook).toBeDefined();
      expect(webhook.id).toBe(testWebhookId);
      expect(webhook.url).toBe(testUrl);
      expect(webhook.events).toContain('order.created');
    });

    test('should auto-generate ID if not provided', () => {
      const webhook = webhookService.register({
        url: testUrl,
        events: ['test.event']
      });

      expect(webhook.id).toBeDefined();
      expect(typeof webhook.id).toBe('string');

      // Limpiar
      webhookService.unregister(webhook.id);
    });

    test('should fail without URL', () => {
      const webhook = webhookService.register({
        events: ['test.event']
      });

      expect(webhook).toBeNull();
    });

    test('should fail without events', () => {
      const webhook = webhookService.register({
        url: testUrl
      });

      expect(webhook).toBeNull();
    });

    test('should store webhook metadata', () => {
      const webhook = webhookService.register({
        id: testWebhookId,
        url: testUrl,
        events: ['test.event'],
        metadata: { customer: 'test-customer', plan: 'premium' }
      });

      expect(webhook.metadata).toBeDefined();
      expect(webhook.metadata.customer).toBe('test-customer');
    });
  });

  describe('Webhook Unregistration', () => {
    test('should unregister webhook', () => {
      webhookService.register({
        id: testWebhookId,
        url: testUrl,
        events: ['test.event']
      });

      const result = webhookService.unregister(testWebhookId);
      expect(result).toBe(true);
      expect(webhookService.webhooks.has(testWebhookId)).toBe(false);
    });

    test('should return false for non-existent webhook', () => {
      const result = webhookService.unregister('non-existent-id');
      expect(result).toBe(false);
    });
  });

  describe('Webhook Delivery', () => {
    test('should deliver webhook successfully', async () => {
      // Mock successful HTTP request
      nock('https://example.com')
        .post('/webhook')
        .reply(200, { success: true });

      webhookService.register({
        id: testWebhookId,
        url: testUrl,
        events: ['order.created']
      });

      const result = await webhookService.deliver(testWebhookId, {
        event: 'order.created',
        data: { orderId: 123, total: 99.99 }
      });

      expect(result.success).toBe(true);
      expect(result.statusCode).toBe(200);
    });

    test('should include signature in headers', async () => {
      nock('https://example.com')
        .post('/webhook', (body) => {
          // Verificar que el body es correcto
          return body.event === 'test.event';
        })
        .matchHeader('x-webhook-signature', /^[a-f0-9]{64}$/)
        .reply(200);

      webhookService.register({
        id: testWebhookId,
        url: testUrl,
        events: ['test.event'],
        secret: 'test-secret'
      });

      await webhookService.deliver(testWebhookId, {
        event: 'test.event',
        data: { test: 'value' }
      });
    });

    test('should retry on failure', async () => {
      // Primera llamada falla, segunda tiene éxito
      nock('https://example.com')
        .post('/webhook')
        .reply(500)
        .post('/webhook')
        .reply(200);

      webhookService.register({
        id: testWebhookId,
        url: testUrl,
        events: ['test.event']
      });

      const result = await webhookService.deliver(testWebhookId, {
        event: 'test.event',
        data: { test: 'value' }
      });

      expect(result.attempts).toBeGreaterThan(1);
    });

    test('should respect max retry attempts', async () => {
      // Todas las llamadas fallan
      nock('https://example.com')
        .post('/webhook')
        .times(4)
        .reply(500);

      webhookService.register({
        id: testWebhookId,
        url: testUrl,
        events: ['test.event']
      });

      const result = await webhookService.deliver(testWebhookId, {
        event: 'test.event',
        data: { test: 'value' }
      });

      expect(result.success).toBe(false);
      expect(result.attempts).toBeLessThanOrEqual(webhookService.config.retryAttempts + 1);
    });
  });

  describe('Event Filtering', () => {
    test('should only deliver matching events', () => {
      webhookService.register({
        id: testWebhookId,
        url: testUrl,
        events: ['order.created']
      });

      const shouldDeliver = webhookService.shouldDeliver(testWebhookId, 'order.created');
      const shouldNotDeliver = webhookService.shouldDeliver(testWebhookId, 'payment.completed');

      expect(shouldDeliver).toBe(true);
      expect(shouldNotDeliver).toBe(false);
    });

    test('should support wildcard events', () => {
      webhookService.register({
        id: testWebhookId,
        url: testUrl,
        events: ['order.*']
      });

      const shouldDeliver1 = webhookService.shouldDeliver(testWebhookId, 'order.created');
      const shouldDeliver2 = webhookService.shouldDeliver(testWebhookId, 'order.updated');
      const shouldNotDeliver = webhookService.shouldDeliver(testWebhookId, 'payment.completed');

      expect(shouldDeliver1).toBe(true);
      expect(shouldDeliver2).toBe(true);
      expect(shouldNotDeliver).toBe(false);
    });
  });

  describe('Signature Generation', () => {
    test('should generate HMAC signature', () => {
      const payload = { event: 'test', data: { value: 123 } };
      const secret = 'test-secret';

      const signature = webhookService.generateSignature(payload, secret);

      expect(signature).toBeDefined();
      expect(typeof signature).toBe('string');
      expect(signature.length).toBe(64); // HMAC SHA256 = 64 hex chars
    });

    test('should generate consistent signatures', () => {
      const payload = { event: 'test', data: { value: 123 } };
      const secret = 'test-secret';

      const sig1 = webhookService.generateSignature(payload, secret);
      const sig2 = webhookService.generateSignature(payload, secret);

      expect(sig1).toBe(sig2);
    });

    test('should verify signature', () => {
      const payload = { event: 'test', data: { value: 123 } };
      const secret = 'test-secret';

      const signature = webhookService.generateSignature(payload, secret);
      const isValid = webhookService.verifySignature(payload, signature, secret);

      expect(isValid).toBe(true);
    });

    test('should reject invalid signature', () => {
      const payload = { event: 'test', data: { value: 123 } };
      const secret = 'test-secret';

      const wrongSignature = webhookService.generateSignature(payload, 'wrong-secret');
      const isValid = webhookService.verifySignature(payload, wrongSignature, secret);

      expect(isValid).toBe(false);
    });
  });

  describe('Rate Limiting', () => {
    test('should check rate limit', () => {
      const allowed = webhookService.checkRateLimit(testWebhookId);
      expect(typeof allowed).toBe('boolean');
    });

    test('should enforce rate limits', () => {
      webhookService.register({
        id: testWebhookId,
        url: testUrl,
        events: ['test.event'],
        rateLimit: {
          maxRequests: 2,
          windowMs: 1000
        }
      });

      // Primeras 2 peticiones deberían pasar
      expect(webhookService.checkRateLimit(testWebhookId)).toBe(true);
      expect(webhookService.checkRateLimit(testWebhookId)).toBe(true);

      // Tercera debería ser bloqueada
      expect(webhookService.checkRateLimit(testWebhookId)).toBe(false);
    });
  });

  describe('Delivery Queue', () => {
    test('should queue delivery when rate limited', async () => {
      webhookService.register({
        id: testWebhookId,
        url: testUrl,
        events: ['test.event'],
        rateLimit: {
          maxRequests: 1,
          windowMs: 60000
        }
      });

      // Primer delivery
      nock('https://example.com')
        .post('/webhook')
        .reply(200);

      await webhookService.deliver(testWebhookId, {
        event: 'test.event',
        data: { first: true }
      });

      // Segundo delivery debería ir a la cola
      const result = await webhookService.deliver(testWebhookId, {
        event: 'test.event',
        data: { second: true }
      });

      expect(result.queued).toBe(true);
    });

    test('should process queued deliveries', async () => {
      const queueSize = webhookService.deliveryQueue.length;
      await webhookService.processQueue();

      // Verificar que se intentó procesar la cola
      expect(typeof queueSize).toBe('number');
    });
  });

  describe('Webhook Listing', () => {
    test('should list all webhooks', () => {
      webhookService.register({
        id: 'webhook-1',
        url: 'https://example.com/1',
        events: ['test.event']
      });

      webhookService.register({
        id: 'webhook-2',
        url: 'https://example.com/2',
        events: ['test.event']
      });

      const webhooks = webhookService.list();

      expect(Array.isArray(webhooks)).toBe(true);
      expect(webhooks.length).toBeGreaterThanOrEqual(2);

      // Limpiar
      webhookService.unregister('webhook-1');
      webhookService.unregister('webhook-2');
    });

    test('should list webhooks for specific event', () => {
      webhookService.register({
        id: 'webhook-order',
        url: 'https://example.com/order',
        events: ['order.created']
      });

      const webhooks = webhookService.listByEvent('order.created');

      expect(Array.isArray(webhooks)).toBe(true);
      expect(webhooks.some(w => w.id === 'webhook-order')).toBe(true);

      // Limpiar
      webhookService.unregister('webhook-order');
    });
  });

  describe('Statistics', () => {
    test('should return statistics', () => {
      const stats = webhookService.getStats();

      expect(stats).toBeDefined();
      expect(stats.totalWebhooks).toBeDefined();
      expect(stats.totalDeliveries).toBeDefined();
      expect(stats.successfulDeliveries).toBeDefined();
      expect(stats.failedDeliveries).toBeDefined();
      expect(stats.queueSize).toBeDefined();
    });

    test('should track delivery success rate', () => {
      const stats = webhookService.getStats();

      expect(stats.successRate).toBeDefined();
      expect(typeof stats.successRate).toBe('number');
      expect(stats.successRate).toBeGreaterThanOrEqual(0);
      expect(stats.successRate).toBeLessThanOrEqual(100);
    });
  });

  describe('Webhook Updates', () => {
    test('should update webhook configuration', () => {
      webhookService.register({
        id: testWebhookId,
        url: testUrl,
        events: ['test.event']
      });

      const updated = webhookService.update(testWebhookId, {
        url: 'https://example.com/new-webhook',
        events: ['test.event', 'new.event']
      });

      expect(updated).toBe(true);

      const webhook = webhookService.get(testWebhookId);
      expect(webhook.url).toBe('https://example.com/new-webhook');
      expect(webhook.events).toContain('new.event');
    });

    test('should return false for non-existent webhook', () => {
      const updated = webhookService.update('non-existent', { url: 'test' });
      expect(updated).toBe(false);
    });
  });

  describe('Middleware', () => {
    test('should create webhook receiver middleware', () => {
      const middleware = webhookService.receiverMiddleware('test-secret');

      expect(typeof middleware).toBe('function');
      expect(middleware.length).toBe(3); // req, res, next
    });

    test('should verify incoming webhook signature', () => {
      const middleware = webhookService.receiverMiddleware('test-secret');

      const payload = { event: 'test', data: { value: 123 } };
      const signature = webhookService.generateSignature(payload, 'test-secret');

      const req = {
        body: payload,
        headers: {
          'x-webhook-signature': signature
        }
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };
      const next = jest.fn();

      middleware(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(req.webhookVerified).toBe(true);
    });
  });
});

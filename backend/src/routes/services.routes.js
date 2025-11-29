/**
 * Rutas API para Servicios SYSME POS v2.1
 * Expone endpoints para todos los servicios implementados
 *
 * @module ServicesRoutes
 * @version 2.1.0
 */

const express = require('express');
const router = express.Router();

// Importar servicios
const emailSMSService = require('../services/email-sms-service');
const performanceOptimizer = require('../services/performance-optimizer');
const configManager = require('../services/config-manager');
const webhookService = require('../services/webhook-service');
const rbacService = require('../services/rbac-service');
const i18nService = require('../services/i18n-service');
const advancedLogger = require('../services/advanced-logger');

// Middleware de autenticación (ejemplo - ajustar según tu sistema)
const authenticate = (req, res, next) => {
  // TODO: Implementar autenticación real
  req.user = { id: 1, role: 'admin' }; // Mock para desarrollo
  next();
};

// ============================================================================
// RUTAS DE NOTIFICACIONES EMAIL/SMS
// ============================================================================

/**
 * POST /api/services/notifications/email
 * Envía un email
 */
router.post('/notifications/email', authenticate, async (req, res) => {
  try {
    const { to, subject, template, data, html, text, attachments, priority } = req.body;

    if (!to || !subject) {
      return res.status(400).json({
        error: 'Destinatario y asunto son requeridos',
        code: 'MISSING_FIELDS'
      });
    }

    const result = await emailSMSService.sendEmail({
      to,
      subject,
      template,
      data,
      html,
      text,
      attachments,
      priority
    });

    res.json({
      success: true,
      result,
      message: 'Email enviado exitosamente'
    });
  } catch (error) {
    console.error('Error enviando email:', error);
    res.status(500).json({
      error: error.message,
      code: 'EMAIL_SEND_ERROR'
    });
  }
});

/**
 * POST /api/services/notifications/sms
 * Envía un SMS
 */
router.post('/notifications/sms', authenticate, async (req, res) => {
  try {
    const { to, message, priority } = req.body;

    if (!to || !message) {
      return res.status(400).json({
        error: 'Número de teléfono y mensaje son requeridos',
        code: 'MISSING_FIELDS'
      });
    }

    const result = await emailSMSService.sendSMS({
      to,
      message,
      priority
    });

    res.json({
      success: true,
      result,
      message: 'SMS enviado exitosamente'
    });
  } catch (error) {
    console.error('Error enviando SMS:', error);
    res.status(500).json({
      error: error.message,
      code: 'SMS_SEND_ERROR'
    });
  }
});

/**
 * GET /api/services/notifications/stats
 * Obtiene estadísticas de notificaciones
 */
router.get('/notifications/stats', authenticate, async (req, res) => {
  try {
    const stats = emailSMSService.getStats();
    res.json(stats);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============================================================================
// RUTAS DE PERFORMANCE
// ============================================================================

/**
 * GET /api/services/performance/report
 * Obtiene reporte de rendimiento
 */
router.get('/performance/report', authenticate, async (req, res) => {
  try {
    const report = performanceOptimizer.getPerformanceReport();
    res.json(report);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/services/performance/metrics
 * Obtiene métricas actuales del sistema
 */
router.get('/performance/metrics', authenticate, async (req, res) => {
  try {
    const metrics = {
      cpu: performanceOptimizer.getCPUUsage(),
      memory: performanceOptimizer.getMemoryUsage(),
      uptime: process.uptime()
    };
    res.json(metrics);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/services/performance/query
 * Registra una query de base de datos
 */
router.post('/performance/query', authenticate, async (req, res) => {
  try {
    const { query, duration, rows } = req.body;
    performanceOptimizer.recordQuery({ query, duration, rows });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============================================================================
// RUTAS DE CONFIGURACIÓN
// ============================================================================

/**
 * GET /api/services/config/:name
 * Obtiene una configuración
 */
router.get('/config/:name', authenticate, async (req, res) => {
  try {
    const config = configManager.get(req.params.name);
    res.json(config);
  } catch (error) {
    res.status(404).json({ error: error.message });
  }
});

/**
 * POST /api/services/config/:name
 * Establece o actualiza una configuración
 */
router.post('/config/:name', authenticate, rbacService.middleware('settings', 'update'), async (req, res) => {
  try {
    const { name } = req.params;
    const config = req.body;

    await configManager.set(name, config);

    res.json({
      success: true,
      message: `Configuración ${name} actualizada`
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/services/config/:name/versions
 * Lista versiones de una configuración
 */
router.get('/config/:name/versions', authenticate, async (req, res) => {
  try {
    const versions = await configManager.listVersions(req.params.name);
    res.json(versions);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/services/config/:name/restore/:timestamp
 * Restaura una versión anterior
 */
router.post('/config/:name/restore/:timestamp', authenticate, rbacService.middleware('settings', 'update'), async (req, res) => {
  try {
    const { name, timestamp } = req.params;
    await configManager.restoreVersion(name, parseInt(timestamp));

    res.json({
      success: true,
      message: 'Versión restaurada exitosamente'
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============================================================================
// RUTAS DE WEBHOOKS
// ============================================================================

/**
 * GET /api/services/webhooks
 * Lista todos los webhooks
 */
router.get('/webhooks', authenticate, async (req, res) => {
  try {
    const webhooks = webhookService.list();
    res.json(webhooks);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/services/webhooks
 * Registra un nuevo webhook
 */
router.post('/webhooks', authenticate, rbacService.middleware('settings', 'update'), async (req, res) => {
  try {
    const { name, url, events, headers, enabled, secret } = req.body;

    const webhookName = webhookService.register({
      name,
      url,
      events,
      headers,
      enabled,
      secret
    });

    res.status(201).json({
      success: true,
      name: webhookName,
      message: 'Webhook registrado exitosamente'
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * PUT /api/services/webhooks/:name
 * Actualiza un webhook
 */
router.put('/webhooks/:name', authenticate, rbacService.middleware('settings', 'update'), async (req, res) => {
  try {
    const { name } = req.params;
    const updates = req.body;

    webhookService.update(name, updates);

    res.json({
      success: true,
      message: 'Webhook actualizado'
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * DELETE /api/services/webhooks/:name
 * Elimina un webhook
 */
router.delete('/webhooks/:name', authenticate, rbacService.middleware('settings', 'update'), async (req, res) => {
  try {
    webhookService.unregister(req.params.name);
    res.json({
      success: true,
      message: 'Webhook eliminado'
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/services/webhooks/:name/test
 * Prueba un webhook
 */
router.post('/webhooks/:name/test', authenticate, async (req, res) => {
  try {
    const testId = await webhookService.test(req.params.name);
    res.json({
      success: true,
      testId,
      message: 'Webhook de prueba enviado'
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/services/webhooks/:name/stats
 * Obtiene estadísticas de un webhook
 */
router.get('/webhooks/:name/stats', authenticate, async (req, res) => {
  try {
    const stats = webhookService.getWebhookStats(req.params.name);
    res.json(stats);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/services/webhooks/logs
 * Obtiene historial de entregas
 */
router.get('/webhooks/logs', authenticate, async (req, res) => {
  try {
    const { webhookName, event, status, limit } = req.query;
    const logs = webhookService.getDeliveryLog({
      webhookName,
      event,
      status,
      limit: parseInt(limit) || 50
    });
    res.json(logs);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============================================================================
// RUTAS DE RBAC
// ============================================================================

/**
 * GET /api/services/rbac/roles
 * Lista todos los roles
 */
router.get('/rbac/roles', authenticate, async (req, res) => {
  try {
    const roles = rbacService.listRoles();
    res.json(roles);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/services/rbac/roles/:roleId
 * Obtiene detalles de un rol
 */
router.get('/rbac/roles/:roleId', authenticate, async (req, res) => {
  try {
    const role = rbacService.getRole(req.params.roleId);
    if (!role) {
      return res.status(404).json({ error: 'Rol no encontrado' });
    }
    res.json(role);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/services/rbac/permissions
 * Lista todos los permisos
 */
router.get('/rbac/permissions', authenticate, async (req, res) => {
  try {
    const permissions = rbacService.listPermissions();
    res.json(permissions);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/services/rbac/users/:userId/roles
 * Asigna un rol a un usuario
 */
router.post('/rbac/users/:userId/roles', authenticate, rbacService.middleware('users', 'update'), async (req, res) => {
  try {
    const { userId } = req.params;
    const { roleId } = req.body;

    rbacService.assignRole(parseInt(userId), roleId);

    res.json({
      success: true,
      message: `Rol ${roleId} asignado al usuario ${userId}`
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * DELETE /api/services/rbac/users/:userId/roles/:roleId
 * Remueve un rol de un usuario
 */
router.delete('/rbac/users/:userId/roles/:roleId', authenticate, rbacService.middleware('users', 'update'), async (req, res) => {
  try {
    const { userId, roleId } = req.params;

    rbacService.removeRole(parseInt(userId), roleId);

    res.json({
      success: true,
      message: `Rol ${roleId} removido del usuario ${userId}`
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/services/rbac/users/:userId/permissions
 * Obtiene permisos de un usuario
 */
router.get('/rbac/users/:userId/permissions', authenticate, async (req, res) => {
  try {
    const permissions = rbacService.getUserPermissions(parseInt(req.params.userId));
    res.json(permissions);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/services/rbac/check
 * Verifica si un usuario tiene un permiso
 */
router.post('/rbac/check', authenticate, async (req, res) => {
  try {
    const { userId, resource, action } = req.body;

    const hasPermission = rbacService.can(userId, resource, action);

    res.json({
      hasPermission,
      userId,
      resource,
      action
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/services/rbac/stats
 * Obtiene estadísticas de RBAC
 */
router.get('/rbac/stats', authenticate, async (req, res) => {
  try {
    const stats = rbacService.getStats();
    res.json(stats);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============================================================================
// RUTAS DE I18N
// ============================================================================

/**
 * GET /api/services/i18n/locales
 * Lista idiomas soportados
 */
router.get('/i18n/locales', async (req, res) => {
  try {
    const locales = i18nService.getSupportedLocales();
    res.json(locales);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/services/i18n/translate
 * Traduce una clave
 */
router.get('/i18n/translate', async (req, res) => {
  try {
    const { key, locale, params } = req.query;

    if (!key) {
      return res.status(400).json({ error: 'Clave requerida' });
    }

    const parsedParams = params ? JSON.parse(params) : {};
    const translation = i18nService.t(key, parsedParams, locale);

    res.json({
      key,
      locale: locale || i18nService.config.defaultLocale,
      translation
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/services/i18n/translations/:locale
 * Agrega o actualiza una traducción
 */
router.post('/i18n/translations/:locale', authenticate, rbacService.middleware('settings', 'update'), async (req, res) => {
  try {
    const { locale } = req.params;
    const { key, value } = req.body;

    await i18nService.setTranslation(locale, key, value);

    res.json({
      success: true,
      message: 'Traducción actualizada'
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/services/i18n/stats
 * Obtiene estadísticas de i18n
 */
router.get('/i18n/stats', authenticate, async (req, res) => {
  try {
    const stats = i18nService.getStats();
    res.json(stats);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============================================================================
// RUTA DE HEALTH CHECK
// ============================================================================

/**
 * GET /api/services/health
 * Verifica el estado de todos los servicios
 */
router.get('/health', async (req, res) => {
  try {
    const health = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      services: {
        email: { status: emailSMSService.emailTransporter ? 'up' : 'down' },
        sms: { status: emailSMSService.smsClient ? 'up' : 'down' },
        performance: { status: performanceOptimizer.monitoring.isRunning ? 'up' : 'down' },
        config: { status: configManager.configurations.size > 0 ? 'up' : 'down' },
        webhooks: { status: webhookService.webhooks.size >= 0 ? 'up' : 'down' },
        rbac: { status: rbacService.roles.size > 0 ? 'up' : 'down' },
        i18n: { status: i18nService.translations.size > 0 ? 'up' : 'down' }
      },
      stats: {
        email: emailSMSService.getStats(),
        performance: performanceOptimizer.getPerformanceReport(),
        webhooks: webhookService.getGlobalStats(),
        rbac: rbacService.getStats(),
        i18n: i18nService.getStats()
      }
    };

    res.json(health);
  } catch (error) {
    res.status(500).json({
      status: 'unhealthy',
      error: error.message
    });
  }
});

// ============================================================================
// RUTAS DE ADVANCED LOGGER
// ============================================================================

/**
 * GET /api/services/logger/stats
 * Obtener estadísticas del logger
 */
router.get('/logger/stats', authenticate, async (req, res) => {
  try {
    const stats = await advancedLogger.getStats();
    res.json({ stats });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/services/logger/query
 * Consultar logs
 */
router.post('/logger/query', authenticate, rbacService.middleware('logs', 'read'), async (req, res) => {
  try {
    const { level, startDate, endDate, search, limit } = req.body;

    const logs = await advancedLogger.queryLogs({
      level,
      startDate,
      endDate,
      search,
      limit: limit || 100
    });

    res.json({
      count: logs.length,
      logs
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/services/logger/log
 * Crear log manualmente
 */
router.post('/logger/log', authenticate, async (req, res) => {
  try {
    const { level, message, meta } = req.body;

    if (!level || !message) {
      return res.status(400).json({ error: 'level and message are required' });
    }

    advancedLogger.log(level, message, meta || {});

    res.json({
      success: true,
      message: 'Log created'
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/services/logger/audit
 * Crear log de auditoría
 */
router.post('/logger/audit', authenticate, async (req, res) => {
  try {
    const { action, details } = req.body;

    if (!action) {
      return res.status(400).json({ error: 'action is required' });
    }

    advancedLogger.audit(action, req.user.id, {
      ...details,
      ip: req.ip,
      userAgent: req.get('user-agent')
    });

    res.json({
      success: true,
      message: 'Audit log created'
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/services/logger/rotate
 * Rotar logs manualmente
 */
router.post('/logger/rotate', authenticate, rbacService.middleware('settings', 'update'), async (req, res) => {
  try {
    const result = await advancedLogger.rotateLogs();

    res.json({
      success: result,
      message: result ? 'Logs rotated successfully' : 'Failed to rotate logs'
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * DELETE /api/services/logger/clean
 * Limpiar logs antiguos
 */
router.delete('/logger/clean', authenticate, rbacService.middleware('settings', 'delete'), async (req, res) => {
  try {
    const { daysOld } = req.query;
    const days = parseInt(daysOld) || 30;

    const deleted = await advancedLogger.cleanOldLogs(days);

    res.json({
      success: true,
      deleted,
      message: `Deleted ${deleted} old log files`
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/services/logger/config
 * Obtener configuración del logger
 */
router.get('/logger/config', authenticate, rbacService.middleware('settings', 'read'), async (req, res) => {
  try {
    res.json({ config: advancedLogger.config });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;

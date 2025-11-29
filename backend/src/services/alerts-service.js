/**
 * Sistema de Alertas y Notificaciones para Producción
 * Maneja alertas críticas, notificaciones y escalación automática
 */

import { EventEmitter } from 'events';
import { enhancedLogger } from '../config/logger-enhanced.js';

class AlertsService extends EventEmitter {
  constructor() {
    super();
    this.alerts = new Map();
    this.rules = new Map();
    this.subscribers = new Map();
    this.isRunning = false;
    this.checkInterval = 10000; // 10 segundos
    this.alertHistory = [];
    this.maxHistorySize = 1000;

    // Configuración de alertas
    this.config = {
      critical_threshold: 90,    // 90% para alertas críticas
      warning_threshold: 75,     // 75% para warnings
      error_threshold: 5,        // 5 errores para alerta
      response_time_threshold: 1000, // 1 segundo
      escalation_delay: 300000,  // 5 minutos para escalación
    };

    this.initializeDefaultRules();
  }

  /**
   * Inicializa reglas de alerta por defecto
   */
  initializeDefaultRules() {
    // Regla de memoria alta
    this.addAlertRule('high_memory_usage', {
      metric: 'system.memory.used',
      condition: 'percentage_above',
      threshold: this.config.warning_threshold,
      criticalThreshold: this.config.critical_threshold,
      description: 'Uso de memoria elevado',
      checkInterval: 30000, // 30 segundos
      cooldown: 300000 // 5 minutos
    });

    // Regla de CPU alta
    this.addAlertRule('high_cpu_usage', {
      metric: 'system.cpu.usage',
      condition: 'above',
      threshold: this.config.warning_threshold,
      criticalThreshold: this.config.critical_threshold,
      description: 'Uso de CPU elevado',
      checkInterval: 30000,
      cooldown: 300000
    });

    // Regla de errores frecuentes
    this.addAlertRule('frequent_errors', {
      metric: 'app.errors.total',
      condition: 'rate_increase',
      threshold: this.config.error_threshold,
      criticalThreshold: this.config.error_threshold * 2,
      description: 'Incremento en errores de aplicación',
      checkInterval: 60000, // 1 minuto
      cooldown: 600000 // 10 minutos
    });

    // Regla de tiempo de respuesta lento
    this.addAlertRule('slow_response_time', {
      metric: 'app.requests.duration',
      condition: 'average_above',
      threshold: this.config.response_time_threshold,
      criticalThreshold: this.config.response_time_threshold * 2,
      description: 'Tiempo de respuesta lento',
      checkInterval: 60000,
      cooldown: 300000
    });

    // Regla de cache con bajo hit rate
    this.addAlertRule('low_cache_hit_rate', {
      metric: 'cache.hit.rate',
      condition: 'below',
      threshold: 50, // 50%
      criticalThreshold: 25, // 25%
      description: 'Tasa de acierto de cache baja',
      checkInterval: 300000, // 5 minutos
      cooldown: 600000
    });

    // Regla de backup fallido
    this.addAlertRule('backup_failure', {
      metric: 'backup.status',
      condition: 'equals',
      threshold: 'failed',
      description: 'Fallo en sistema de backup',
      checkInterval: 600000, // 10 minutos
      cooldown: 1800000 // 30 minutos
    });

    enhancedLogger.info(`🚨 ${this.rules.size} reglas de alerta inicializadas`);
  }

  /**
   * Agrega una nueva regla de alerta
   */
  addAlertRule(ruleId, config) {
    this.rules.set(ruleId, {
      id: ruleId,
      ...config,
      lastCheck: 0,
      lastAlert: 0,
      alertCount: 0,
      isActive: true
    });

    enhancedLogger.info(`Regla de alerta agregada: ${ruleId}`);
  }

  /**
   * Suscribe un manejador de alertas
   */
  subscribe(type, handler, config = {}) {
    if (!this.subscribers.has(type)) {
      this.subscribers.set(type, []);
    }

    this.subscribers.get(type).push({
      handler,
      priority: config.priority || 'medium',
      enabled: config.enabled !== false,
      filters: config.filters || {}
    });

    enhancedLogger.info(`Nuevo suscriptor para alertas: ${type}`);
  }

  /**
   * Inicia el sistema de monitoreo de alertas
   */
  start() {
    if (this.isRunning) {
      enhancedLogger.warn('Alert system already running');
      return;
    }

    this.isRunning = true;

    // Intervalo principal de verificación
    this.checkInterval = setInterval(() => {
      this.checkAllRules();
    }, this.checkInterval);

    enhancedLogger.info('🚨 Sistema de alertas iniciado');
    this.emit('alerts.started');
  }

  /**
   * Detiene el sistema de alertas
   */
  stop() {
    if (!this.isRunning) {
      return;
    }

    this.isRunning = false;

    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }

    enhancedLogger.info('🚨 Sistema de alertas detenido');
    this.emit('alerts.stopped');
  }

  /**
   * Verifica todas las reglas activas
   */
  async checkAllRules() {
    try {
      for (const [ruleId, rule] of this.rules) {
        if (!rule.isActive) continue;

        const now = Date.now();

        // Verificar si es tiempo de chequear
        if (now - rule.lastCheck < (rule.checkInterval || 60000)) {
          continue;
        }

        rule.lastCheck = now;

        try {
          await this.checkRule(rule);
        } catch (error) {
          enhancedLogger.error(`Error checking rule ${ruleId}:`, error);
        }
      }
    } catch (error) {
      enhancedLogger.error('Error in alert rules check:', error);
    }
  }

  /**
   * Verifica una regla específica
   */
  async checkRule(rule) {
    // Aquí se verificaría la métrica real
    // Por simplicidad, simulamos algunas condiciones

    const now = Date.now();
    const cooldownPassed = now - rule.lastAlert > (rule.cooldown || 300000);

    if (!cooldownPassed) {
      return; // Aún en periodo de cooldown
    }

    // Simular verificación de métrica
    const alertData = await this.evaluateRule(rule);

    if (alertData.shouldAlert) {
      rule.lastAlert = now;
      rule.alertCount++;

      const alert = {
        id: `${rule.id}_${now}`,
        ruleId: rule.id,
        type: alertData.type,
        severity: alertData.severity,
        message: `${rule.description}: ${alertData.message}`,
        value: alertData.value,
        threshold: alertData.threshold,
        timestamp: now,
        acknowledged: false,
        resolved: false
      };

      this.triggerAlert(alert);
    }
  }

  /**
   * Evalúa una regla contra métricas reales
   */
  async evaluateRule(rule) {
    // Simulación de evaluación de reglas
    // En un sistema real, aquí se consultarían las métricas del MetricsService

    const result = {
      shouldAlert: false,
      type: 'info',
      severity: 'low',
      message: '',
      value: null,
      threshold: rule.threshold
    };

    // Ejemplo: Simular uso de memoria alto ocasional
    if (rule.id === 'high_memory_usage') {
      const memUsage = process.memoryUsage();
      const usagePercent = (memUsage.heapUsed / memUsage.heapTotal) * 100;

      result.value = usagePercent;

      if (usagePercent > rule.criticalThreshold) {
        result.shouldAlert = true;
        result.type = 'critical';
        result.severity = 'high';
        result.message = `${usagePercent.toFixed(1)}% (Critical)`;
      } else if (usagePercent > rule.threshold) {
        result.shouldAlert = true;
        result.type = 'warning';
        result.severity = 'medium';
        result.message = `${usagePercent.toFixed(1)}% (Warning)`;
      }
    }

    // Más reglas simuladas...
    if (rule.id === 'frequent_errors' && Math.random() > 0.95) {
      result.shouldAlert = true;
      result.type = 'warning';
      result.severity = 'medium';
      result.message = 'Aumento detectado en errores';
    }

    return result;
  }

  /**
   * Dispara una alerta
   */
  triggerAlert(alert) {
    // Agregar a historial
    this.addToHistory(alert);

    // Almacenar alerta activa
    this.alerts.set(alert.id, alert);

    // Log de la alerta
    const logLevel = alert.severity === 'high' ? 'error' : 'warn';
    enhancedLogger[logLevel](`🚨 ALERT [${alert.type.toUpperCase()}]: ${alert.message}`, {
      alertId: alert.id,
      ruleId: alert.ruleId,
      severity: alert.severity,
      value: alert.value,
      threshold: alert.threshold
    });

    // Notificar suscriptores
    this.notifySubscribers(alert);

    // Emitir evento
    this.emit('alert.triggered', alert);

    // Programar escalación si es crítica
    if (alert.severity === 'high') {
      setTimeout(() => {
        this.escalateAlert(alert.id);
      }, this.config.escalation_delay);
    }
  }

  /**
   * Notifica a los suscriptores
   */
  notifySubscribers(alert) {
    const subscribers = this.subscribers.get(alert.type) || [];
    const allSubscribers = this.subscribers.get('all') || [];

    [...subscribers, ...allSubscribers].forEach(subscriber => {
      if (!subscriber.enabled) return;

      try {
        subscriber.handler(alert);
      } catch (error) {
        enhancedLogger.error('Error notifying subscriber:', error);
      }
    });
  }

  /**
   * Escala una alerta no resuelta
   */
  escalateAlert(alertId) {
    const alert = this.alerts.get(alertId);
    if (!alert || alert.resolved || alert.acknowledged) {
      return;
    }

    enhancedLogger.error(`🚨 ALERT ESCALATION: ${alert.message}`, {
      alertId: alert.id,
      originalTime: new Date(alert.timestamp).toISOString(),
      escalationTime: new Date().toISOString()
    });

    // Notificar escalación
    this.emit('alert.escalated', alert);
  }

  /**
   * Reconoce una alerta
   */
  acknowledgeAlert(alertId, userId = 'system') {
    const alert = this.alerts.get(alertId);
    if (!alert) {
      return false;
    }

    alert.acknowledged = true;
    alert.acknowledgedBy = userId;
    alert.acknowledgedAt = Date.now();

    enhancedLogger.info(`Alert acknowledged: ${alertId} by ${userId}`);
    this.emit('alert.acknowledged', alert);

    return true;
  }

  /**
   * Resuelve una alerta
   */
  resolveAlert(alertId, userId = 'system') {
    const alert = this.alerts.get(alertId);
    if (!alert) {
      return false;
    }

    alert.resolved = true;
    alert.resolvedBy = userId;
    alert.resolvedAt = Date.now();

    enhancedLogger.info(`Alert resolved: ${alertId} by ${userId}`);
    this.emit('alert.resolved', alert);

    // Remover de alertas activas
    this.alerts.delete(alertId);

    return true;
  }

  /**
   * Agrega alerta al historial
   */
  addToHistory(alert) {
    this.alertHistory.unshift(alert);
    if (this.alertHistory.length > this.maxHistorySize) {
      this.alertHistory = this.alertHistory.slice(0, this.maxHistorySize);
    }
  }

  /**
   * Obtiene alertas activas
   */
  getActiveAlerts() {
    return Array.from(this.alerts.values());
  }

  /**
   * Obtiene historial de alertas
   */
  getAlertHistory(limit = 50) {
    return this.alertHistory.slice(0, limit);
  }

  /**
   * Obtiene estadísticas de alertas
   */
  getAlertStats() {
    const activeAlerts = this.getActiveAlerts();
    const last24h = Date.now() - 24 * 60 * 60 * 1000;
    const recentAlerts = this.alertHistory.filter(alert => alert.timestamp > last24h);

    return {
      active: {
        total: activeAlerts.length,
        critical: activeAlerts.filter(a => a.severity === 'high').length,
        warning: activeAlerts.filter(a => a.severity === 'medium').length,
        info: activeAlerts.filter(a => a.severity === 'low').length
      },
      recent: {
        total: recentAlerts.length,
        critical: recentAlerts.filter(a => a.severity === 'high').length,
        warning: recentAlerts.filter(a => a.severity === 'medium').length,
        info: recentAlerts.filter(a => a.severity === 'low').length
      },
      rules: {
        total: this.rules.size,
        active: Array.from(this.rules.values()).filter(r => r.isActive).length
      },
      system: {
        running: this.isRunning,
        subscribers: Array.from(this.subscribers.keys()).length
      }
    };
  }

  /**
   * Obtiene estado del servicio
   */
  getStatus() {
    return {
      running: this.isRunning,
      rules: this.rules.size,
      activeAlerts: this.alerts.size,
      subscribers: Array.from(this.subscribers.values())
        .reduce((total, subs) => total + subs.length, 0),
      lastCheck: Math.max(...Array.from(this.rules.values()).map(r => r.lastCheck))
    };
  }
}

// Instancia global del servicio de alertas
const alertsService = new AlertsService();

export { alertsService, AlertsService };
export default alertsService;
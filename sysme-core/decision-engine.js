/**
 * JARVIS Mark VII v2.1.0 - Decision Engine
 * Motor de Decisiones
 *
 * Evalúa opciones y toma decisiones basadas en:
 * - Contexto actual
 * - Memoria histórica
 * - Reglas de negocio
 * - Probabilidades
 *
 * @module DecisionEngine
 * @version 2.1.0
 */

class DecisionEngine {
  constructor(memoryManager = null) {
    this.memoryManager = memoryManager;

    // Reglas de decisión por dominio
    this.rules = {
      sales: {
        low_stock_alert: {
          condition: (data) => data.stock < data.minStock,
          action: 'alert_low_stock',
          priority: 'high',
          confidence: 0.9
        },
        suggest_upsell: {
          condition: (data) => data.cart && data.cart.total > 50000,
          action: 'suggest_products',
          priority: 'medium',
          confidence: 0.7
        },
        apply_discount: {
          condition: (data) => data.customer && data.customer.isVIP,
          action: 'apply_vip_discount',
          priority: 'medium',
          confidence: 0.8
        }
      },
      inventory: {
        restock_needed: {
          condition: (data) => data.stock <= data.reorderPoint,
          action: 'create_purchase_order',
          priority: 'high',
          confidence: 0.85
        },
        excess_stock: {
          condition: (data) => data.stock > data.maxStock * 1.5,
          action: 'suggest_promotion',
          priority: 'low',
          confidence: 0.6
        }
      },
      operations: {
        schedule_backup: {
          condition: (data) => data.hoursSinceLastBackup >= 24,
          action: 'trigger_backup',
          priority: 'critical',
          confidence: 1.0
        },
        optimize_performance: {
          condition: (data) => data.responseTime > 1000,
          action: 'optimize_queries',
          priority: 'medium',
          confidence: 0.7
        }
      }
    };

    // Historial de decisiones
    this.decisionHistory = [];
  }

  /**
   * Toma una decisión basada en el contexto
   */
  async decide(context) {
    try {
      const decision = {
        timestamp: Date.now(),
        context: context,
        domain: context.domain || 'general',
        options: [],
        selected: null,
        confidence: 0,
        reasoning: []
      };

      // 1. Evaluar reglas aplicables
      const applicableRules = await this.evaluateRules(context);

      // 2. Consultar memoria si está disponible
      if (this.memoryManager) {
        const memories = await this.queryRelevantMemories(context);
        decision.reasoning.push({
          type: 'memory',
          data: memories,
          weight: 0.3
        });
      }

      // 3. Calcular opciones y probabilidades
      decision.options = await this.calculateOptions(context, applicableRules);

      // 4. Seleccionar mejor opción
      decision.selected = this.selectBestOption(decision.options);
      decision.confidence = decision.selected?.confidence || 0;

      // 5. Generar razonamiento
      decision.reasoning.push({
        type: 'rules',
        applied: applicableRules.length,
        weight: 0.5
      });

      decision.reasoning.push({
        type: 'selection',
        options_evaluated: decision.options.length,
        selected: decision.selected?.action,
        weight: 0.2
      });

      // 6. Guardar en historial
      this.decisionHistory.push(decision);

      // Limitar historial
      if (this.decisionHistory.length > 1000) {
        this.decisionHistory.shift();
      }

      return decision;
    } catch (error) {
      console.error('❌ Error en Decision Engine:', error);
      return {
        error: error.message,
        context: context,
        timestamp: Date.now()
      };
    }
  }

  /**
   * Evalúa reglas aplicables al contexto
   */
  async evaluateRules(context) {
    const domain = context.domain || 'general';
    const domainRules = this.rules[domain] || {};

    const applicable = [];

    for (const [ruleName, rule] of Object.entries(domainRules)) {
      try {
        if (rule.condition(context)) {
          applicable.push({
            name: ruleName,
            action: rule.action,
            priority: rule.priority,
            confidence: rule.confidence
          });
        }
      } catch (error) {
        console.warn(`⚠️  Error evaluando regla ${ruleName}:`, error.message);
      }
    }

    return applicable;
  }

  /**
   * Consulta memorias relevantes
   */
  async queryRelevantMemories(context) {
    if (!this.memoryManager || !this.memoryManager.initialized) {
      return [];
    }

    try {
      // Buscar memorias similares
      const query = context.description || context.type || '';
      if (!query) return [];

      const memories = await this.memoryManager.searchLongTermMemory(query);
      return memories.slice(0, 5); // Top 5
    } catch (error) {
      console.warn('⚠️  Error consultando memorias:', error.message);
      return [];
    }
  }

  /**
   * Calcula opciones disponibles
   */
  async calculateOptions(context, rules) {
    const options = [];

    // Opciones desde reglas
    for (const rule of rules) {
      options.push({
        action: rule.action,
        source: 'rule',
        priority: rule.priority,
        confidence: rule.confidence,
        metadata: {
          rule: rule.name
        }
      });
    }

    // Opciones desde contexto
    if (context.suggested_actions) {
      for (const action of context.suggested_actions) {
        options.push({
          action: action.type,
          source: 'context',
          priority: action.priority || 'medium',
          confidence: action.confidence || 0.5,
          metadata: action.metadata || {}
        });
      }
    }

    // Opciones por defecto
    if (options.length === 0) {
      options.push({
        action: 'no_action',
        source: 'default',
        priority: 'low',
        confidence: 0.3,
        metadata: {
          reason: 'No applicable rules or suggestions'
        }
      });
    }

    return options;
  }

  /**
   * Selecciona la mejor opción
   */
  selectBestOption(options) {
    if (options.length === 0) {
      return null;
    }

    // Ordenar por prioridad y confianza
    const priorityWeights = {
      critical: 4,
      high: 3,
      medium: 2,
      low: 1
    };

    const scored = options.map(option => ({
      ...option,
      score: (priorityWeights[option.priority] || 1) * option.confidence
    }));

    scored.sort((a, b) => b.score - a.score);

    return scored[0];
  }

  /**
   * Registra regla personalizada
   */
  registerRule(domain, ruleName, rule) {
    if (!this.rules[domain]) {
      this.rules[domain] = {};
    }

    if (!rule.condition || !rule.action) {
      throw new Error('Regla debe tener condition y action');
    }

    this.rules[domain][ruleName] = {
      condition: rule.condition,
      action: rule.action,
      priority: rule.priority || 'medium',
      confidence: rule.confidence || 0.7
    };

    console.log(`✅ Regla registrada: ${domain}.${ruleName}`);
  }

  /**
   * Evalúa probabilidad de éxito de una acción
   */
  evaluateProbability(action, context) {
    // Buscar acciones similares en el historial
    const similar = this.decisionHistory.filter(d =>
      d.selected?.action === action &&
      d.context.domain === context.domain
    );

    if (similar.length === 0) {
      return 0.5; // Sin datos históricos, probabilidad neutral
    }

    // Calcular tasa de éxito
    const successful = similar.filter(d => d.context.success === true).length;
    const probability = successful / similar.length;

    return probability;
  }

  /**
   * Obtiene estadísticas de decisiones
   */
  getStats() {
    const total = this.decisionHistory.length;

    if (total === 0) {
      return {
        total: 0,
        byDomain: {},
        byAction: {},
        averageConfidence: 0
      };
    }

    const byDomain = {};
    const byAction = {};
    let totalConfidence = 0;

    for (const decision of this.decisionHistory) {
      // Por dominio
      const domain = decision.domain || 'general';
      byDomain[domain] = (byDomain[domain] || 0) + 1;

      // Por acción
      if (decision.selected) {
        const action = decision.selected.action;
        byAction[action] = (byAction[action] || 0) + 1;
      }

      // Confianza
      totalConfidence += decision.confidence;
    }

    return {
      total,
      byDomain,
      byAction,
      averageConfidence: totalConfidence / total,
      last24h: this.decisionHistory.filter(d =>
        Date.now() - d.timestamp < 24 * 60 * 60 * 1000
      ).length
    };
  }

  /**
   * Exporta historial de decisiones
   */
  exportHistory(limit = 100) {
    return this.decisionHistory
      .slice(-limit)
      .map(d => ({
        timestamp: new Date(d.timestamp).toISOString(),
        domain: d.domain,
        action: d.selected?.action,
        confidence: d.confidence,
        options_count: d.options.length
      }));
  }

  /**
   * Limpia historial antiguo
   */
  clearOldHistory(daysOld = 30) {
    const cutoff = Date.now() - (daysOld * 24 * 60 * 60 * 1000);

    const before = this.decisionHistory.length;
    this.decisionHistory = this.decisionHistory.filter(d => d.timestamp >= cutoff);
    const after = this.decisionHistory.length;

    console.log(`🗑️  ${before - after} decisiones antiguas eliminadas`);
    return before - after;
  }
}

module.exports = DecisionEngine;

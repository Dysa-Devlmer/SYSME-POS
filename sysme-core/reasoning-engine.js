/**
 * JARVIS Mark VII v2.1.0 - Reasoning Engine
 * Motor de Razonamiento Lógico
 *
 * Capacidades:
 * - Razonamiento deductivo
 * - Razonamiento inductivo
 * - Razonamiento causal
 * - Inferencia lógica
 *
 * @module ReasoningEngine
 * @version 2.1.0
 */

class ReasoningEngine {
  constructor() {
    // Base de conocimiento (hechos y reglas)
    this.knowledgeBase = {
      facts: new Set(),
      rules: []
    };

    // Cadena de razonamiento
    this.reasoningChain = [];
  }

  /**
   * Agrega un hecho a la base de conocimiento
   */
  addFact(fact) {
    this.knowledgeBase.facts.add(fact);
    console.log(`📌 Hecho agregado: ${fact}`);
  }

  /**
   * Agrega una regla de inferencia
   */
  addRule(rule) {
    if (!rule.conditions || !rule.conclusion) {
      throw new Error('Regla debe tener conditions y conclusion');
    }

    this.knowledgeBase.rules.push({
      id: Date.now(),
      conditions: Array.isArray(rule.conditions) ? rule.conditions : [rule.conditions],
      conclusion: rule.conclusion,
      confidence: rule.confidence || 1.0,
      metadata: rule.metadata || {}
    });

    console.log(`📋 Regla agregada: ${rule.conditions.join(' AND ')} → ${rule.conclusion}`);
  }

  /**
   * Razonamiento deductivo (de general a específico)
   */
  async deductiveReasoning(query) {
    const result = {
      type: 'deductive',
      query: query,
      conclusion: null,
      confidence: 0,
      chain: [],
      timestamp: Date.now()
    };

    // Buscar hechos directos
    if (this.knowledgeBase.facts.has(query)) {
      result.conclusion = query;
      result.confidence = 1.0;
      result.chain.push({
        step: 'direct_fact',
        value: query
      });
      return result;
    }

    // Aplicar reglas de inferencia
    for (const rule of this.knowledgeBase.rules) {
      // Verificar si todas las condiciones se cumplen
      const allConditionsMet = rule.conditions.every(condition =>
        this.knowledgeBase.facts.has(condition) || this.evaluateCondition(condition)
      );

      if (allConditionsMet) {
        // Agregar conclusión como nuevo hecho
        this.addFact(rule.conclusion);

        result.chain.push({
          step: 'rule_applied',
          rule: rule.id,
          conditions: rule.conditions,
          conclusion: rule.conclusion
        });

        // Si la conclusión es lo que buscamos
        if (rule.conclusion === query) {
          result.conclusion = rule.conclusion;
          result.confidence = rule.confidence;
          break;
        }
      }
    }

    return result;
  }

  /**
   * Razonamiento inductivo (de específico a general)
   */
  async inductiveReasoning(observations) {
    const result = {
      type: 'inductive',
      observations: observations,
      pattern: null,
      generalization: null,
      confidence: 0,
      timestamp: Date.now()
    };

    if (!Array.isArray(observations) || observations.length < 2) {
      result.error = 'Se requieren al menos 2 observaciones';
      return result;
    }

    // Buscar patrones comunes
    const pattern = this.findCommonPattern(observations);

    if (pattern) {
      result.pattern = pattern;
      result.generalization = this.generateGeneralization(pattern, observations);
      result.confidence = this.calculateInductiveConfidence(observations.length);
    }

    return result;
  }

  /**
   * Razonamiento causal (causa y efecto)
   */
  async causalReasoning(cause, effect) {
    const result = {
      type: 'causal',
      cause: cause,
      effect: effect,
      relationship: null,
      confidence: 0,
      evidence: [],
      timestamp: Date.now()
    };

    // Buscar evidencia en la base de conocimiento
    const evidence = [];

    for (const rule of this.knowledgeBase.rules) {
      if (rule.conditions.includes(cause) && rule.conclusion === effect) {
        evidence.push({
          type: 'direct_rule',
          rule: rule.id,
          confidence: rule.confidence
        });
      }
    }

    if (evidence.length > 0) {
      result.relationship = 'confirmed';
      result.evidence = evidence;
      result.confidence = evidence.reduce((sum, e) => sum + e.confidence, 0) / evidence.length;
    } else {
      // Buscar relación indirecta
      const indirect = await this.findIndirectRelation(cause, effect);
      if (indirect) {
        result.relationship = 'indirect';
        result.evidence = indirect;
        result.confidence = 0.6;
      } else {
        result.relationship = 'unknown';
        result.confidence = 0.1;
      }
    }

    return result;
  }

  /**
   * Inferencia lógica general
   */
  async infer(premises) {
    const result = {
      type: 'inference',
      premises: premises,
      conclusions: [],
      confidence: 0,
      timestamp: Date.now()
    };

    // Agregar premisas como hechos temporales
    for (const premise of premises) {
      this.addFact(premise);
    }

    // Aplicar todas las reglas posibles
    let newFactsAdded = true;
    let iterations = 0;
    const maxIterations = 10;

    while (newFactsAdded && iterations < maxIterations) {
      newFactsAdded = false;
      iterations++;

      for (const rule of this.knowledgeBase.rules) {
        const allConditionsMet = rule.conditions.every(condition =>
          this.knowledgeBase.facts.has(condition)
        );

        if (allConditionsMet && !this.knowledgeBase.facts.has(rule.conclusion)) {
          this.addFact(rule.conclusion);
          result.conclusions.push({
            conclusion: rule.conclusion,
            confidence: rule.confidence,
            iteration: iterations
          });
          newFactsAdded = true;
        }
      }
    }

    // Calcular confianza promedio
    if (result.conclusions.length > 0) {
      result.confidence = result.conclusions.reduce((sum, c) => sum + c.confidence, 0) / result.conclusions.length;
    }

    return result;
  }

  /**
   * Evalúa una condición
   */
  evaluateCondition(condition) {
    // Condiciones simples por ahora
    return this.knowledgeBase.facts.has(condition);
  }

  /**
   * Encuentra patrón común en observaciones
   */
  findCommonPattern(observations) {
    // Análisis simple: buscar substring común
    if (observations.length < 2) return null;

    let common = observations[0];

    for (let i = 1; i < observations.length; i++) {
      const obs = observations[i];
      let newCommon = '';

      for (let j = 0; j < Math.min(common.length, obs.length); j++) {
        if (common[j] === obs[j]) {
          newCommon += common[j];
        } else {
          break;
        }
      }

      common = newCommon;
      if (common.length === 0) break;
    }

    return common.length > 0 ? common : null;
  }

  /**
   * Genera generalización desde patrón
   */
  generateGeneralization(pattern, observations) {
    return `Todas las observaciones comparten el patrón: "${pattern}"`;
  }

  /**
   * Calcula confianza inductiva
   */
  calculateInductiveConfidence(observationCount) {
    // Más observaciones = mayor confianza (hasta un límite)
    return Math.min(0.5 + (observationCount * 0.1), 0.95);
  }

  /**
   * Busca relación indirecta entre causa y efecto
   */
  async findIndirectRelation(cause, effect) {
    // BFS para encontrar camino
    const queue = [[cause]];
    const visited = new Set([cause]);
    const maxDepth = 5;

    while (queue.length > 0) {
      const path = queue.shift();

      if (path.length > maxDepth) continue;

      const current = path[path.length - 1];

      // Buscar reglas que tengan current como condición
      for (const rule of this.knowledgeBase.rules) {
        if (rule.conditions.includes(current)) {
          if (rule.conclusion === effect) {
            return [{
              type: 'indirect_path',
              path: [...path, effect],
              confidence: Math.pow(0.9, path.length)
            }];
          }

          if (!visited.has(rule.conclusion)) {
            visited.add(rule.conclusion);
            queue.push([...path, rule.conclusion]);
          }
        }
      }
    }

    return null;
  }

  /**
   * Explica el razonamiento
   */
  explain(result) {
    let explanation = `Tipo de razonamiento: ${result.type}\n`;
    explanation += `Confianza: ${(result.confidence * 100).toFixed(1)}%\n\n`;

    if (result.chain && result.chain.length > 0) {
      explanation += 'Cadena de razonamiento:\n';
      result.chain.forEach((step, i) => {
        explanation += `${i + 1}. ${step.step}: ${JSON.stringify(step)}\n`;
      });
    }

    if (result.conclusions && result.conclusions.length > 0) {
      explanation += '\nConclusiones:\n';
      result.conclusions.forEach((c, i) => {
        explanation += `${i + 1}. ${c.conclusion} (confianza: ${(c.confidence * 100).toFixed(1)}%)\n`;
      });
    }

    return explanation;
  }

  /**
   * Limpia la base de conocimiento
   */
  clearKnowledge() {
    this.knowledgeBase.facts.clear();
    this.knowledgeBase.rules = [];
    this.reasoningChain = [];
    console.log('🗑️  Base de conocimiento limpiada');
  }

  /**
   * Exporta base de conocimiento
   */
  exportKnowledge() {
    return {
      facts: Array.from(this.knowledgeBase.facts),
      rules: this.knowledgeBase.rules.map(r => ({
        conditions: r.conditions,
        conclusion: r.conclusion,
        confidence: r.confidence
      })),
      totalFacts: this.knowledgeBase.facts.size,
      totalRules: this.knowledgeBase.rules.length
    };
  }
}

module.exports = ReasoningEngine;

// core/neural-memory/user-profile.cjs
// User Profile & Loyalty System - JARVIS aprende sobre ti

const { EventEmitter } = require('events');

/**
 * User Profile Manager
 *
 * Aprende y recuerda:
 * - Tu estilo de código
 * - Tus preferencias
 * - Tus objetivos
 * - Tu forma de trabajar
 * - Patrones de comportamiento
 */
class UserProfileManager extends EventEmitter {
  constructor(memoryManager, options = {}) {
    super();

    this.memory = memoryManager;
    this.profile = {
      preferences: {},
      codingStyle: {},
      goals: [],
      workPatterns: {},
      personality: {},
      loyalty: {
        trustLevel: 0.5,
        interactions: 0,
        successfulHelps: 0,
        corrections: 0
      }
    };

    this.learningRate = options.learningRate || 0.1;
  }

  /**
   * Inicializa el perfil del usuario
   */
  async initialize() {
    console.log('👤 [User Profile] Inicializando perfil de usuario...');

    await this.loadProfile();

    console.log('✅ [User Profile] Perfil cargado');
  }

  /**
   * Carga el perfil desde la base de datos
   */
  async loadProfile() {
    return new Promise((resolve) => {
      this.memory.db.all(
        'SELECT * FROM user_profile',
        (err, rows) => {
          if (err || !rows) {
            console.log('ℹ️ [User Profile] Sin perfil previo, creando nuevo');
            return resolve();
          }

          // Reconstruir perfil
          rows.forEach(row => {
            try {
              const category = row.category;
              const key = row.key;
              const value = JSON.parse(row.value);

              if (!this.profile[category]) {
                this.profile[category] = {};
              }

              this.profile[category][key] = {
                value,
                confidence: row.confidence,
                updatedAt: row.updated_at
              };
            } catch (e) {
              console.error(`❌ Error parseando perfil: ${row.key}`);
            }
          });

          console.log(`📊 [User Profile] ${rows.length} preferencias cargadas`);
          resolve();
        }
      );
    });
  }

  /**
   * Aprende una preferencia del usuario
   */
  async learnPreference(category, key, value, confidence = 0.7) {
    const timestamp = Date.now();

    return new Promise((resolve, reject) => {
      // Verificar si ya existe
      this.memory.db.get(
        'SELECT * FROM user_profile WHERE key = ?',
        [key],
        (err, existing) => {
          if (err) return reject(err);

          if (existing) {
            // Actualizar confianza
            const newConfidence = Math.min(
              existing.confidence + this.learningRate,
              1.0
            );

            this.memory.db.run(
              `UPDATE user_profile
               SET value = ?, confidence = ?, updated_at = ?
               WHERE key = ?`,
              [JSON.stringify(value), newConfidence, timestamp, key],
              (err) => {
                if (err) return reject(err);

                console.log(`🔄 [User Profile] Preferencia actualizada: ${key} (confianza: ${(newConfidence * 100).toFixed(0)}%)`);

                // Actualizar en memoria
                if (!this.profile[category]) {
                  this.profile[category] = {};
                }

                this.profile[category][key] = {
                  value,
                  confidence: newConfidence,
                  updatedAt: timestamp
                };

                this.emit('preference:updated', {
                  category,
                  key,
                  value,
                  confidence: newConfidence
                });

                resolve(newConfidence);
              }
            );
          } else {
            // Insertar nueva preferencia
            this.memory.db.run(
              `INSERT INTO user_profile (key, value, category, confidence, updated_at)
               VALUES (?, ?, ?, ?, ?)`,
              [key, JSON.stringify(value), category, confidence, timestamp],
              (err) => {
                if (err) return reject(err);

                console.log(`✨ [User Profile] Nueva preferencia aprendida: ${key}`);

                // Guardar en memoria
                if (!this.profile[category]) {
                  this.profile[category] = {};
                }

                this.profile[category][key] = {
                  value,
                  confidence,
                  updatedAt: timestamp
                };

                this.emit('preference:learned', {
                  category,
                  key,
                  value,
                  confidence
                });

                resolve(confidence);
              }
            );
          }
        }
      );
    });
  }

  /**
   * Aprende el estilo de código del usuario
   */
  async learnCodingStyle(codeAnalysis) {
    const style = {
      indentation: codeAnalysis.indentation || 'spaces',
      indentSize: codeAnalysis.indentSize || 2,
      quotes: codeAnalysis.quotes || 'single',
      semicolons: codeAnalysis.semicolons !== false,
      bracketStyle: codeAnalysis.bracketStyle || 'same-line',
      namingConvention: codeAnalysis.namingConvention || 'camelCase',
      lineLength: codeAnalysis.lineLength || 80,
      commentsStyle: codeAnalysis.commentsStyle || 'descriptive'
    };

    for (const [key, value] of Object.entries(style)) {
      await this.learnPreference('codingStyle', key, value, 0.6);
    }

    console.log('✅ [User Profile] Estilo de código aprendido');

    this.emit('coding-style:learned', style);
  }

  /**
   * Registra interacción exitosa (aumenta loyalty)
   */
  async recordSuccessfulHelp(context = {}) {
    this.profile.loyalty.successfulHelps++;
    this.profile.loyalty.interactions++;

    // Aumentar trust level
    const newTrustLevel = Math.min(
      this.profile.loyalty.trustLevel + 0.05,
      1.0
    );

    this.profile.loyalty.trustLevel = newTrustLevel;

    await this.learnPreference(
      'loyalty',
      'trust_level',
      newTrustLevel,
      0.9
    );

    console.log(`💚 [User Profile] Trust level: ${(newTrustLevel * 100).toFixed(0)}%`);

    this.emit('loyalty:increased', {
      trustLevel: newTrustLevel,
      successfulHelps: this.profile.loyalty.successfulHelps
    });
  }

  /**
   * Registra corrección del usuario (aprende de errores)
   */
  async recordCorrection(correction) {
    this.profile.loyalty.corrections++;
    this.profile.loyalty.interactions++;

    // Ligeramente reduce trust, pero no mucho
    const newTrustLevel = Math.max(
      this.profile.loyalty.trustLevel - 0.02,
      0.3
    );

    this.profile.loyalty.trustLevel = newTrustLevel;

    // Aprender de la corrección
    if (correction.type && correction.preferred) {
      await this.learnPreference(
        'corrections',
        correction.type,
        correction.preferred,
        0.8
      );
    }

    console.log(`📝 [User Profile] Corrección aprendida: ${correction.type}`);

    this.emit('correction:learned', {
      correction,
      trustLevel: newTrustLevel
    });
  }

  /**
   * Registra un objetivo del usuario
   */
  async addGoal(goal) {
    const timestamp = Date.now();

    const goalData = {
      id: `goal-${timestamp}`,
      title: goal.title,
      description: goal.description,
      priority: goal.priority || 'medium',
      status: 'active',
      createdAt: timestamp,
      deadline: goal.deadline || null,
      progress: 0
    };

    this.profile.goals.push(goalData);

    await this.learnPreference(
      'goals',
      goalData.id,
      goalData,
      0.9
    );

    console.log(`🎯 [User Profile] Nuevo objetivo: ${goal.title}`);

    this.emit('goal:added', goalData);

    return goalData;
  }

  /**
   * Actualiza progreso de un objetivo
   */
  async updateGoalProgress(goalId, progress) {
    const goal = this.profile.goals.find(g => g.id === goalId);

    if (!goal) {
      console.error(`❌ [User Profile] Objetivo no encontrado: ${goalId}`);
      return;
    }

    goal.progress = progress;

    if (progress >= 100) {
      goal.status = 'completed';
      goal.completedAt = Date.now();

      console.log(`🎉 [User Profile] Objetivo completado: ${goal.title}`);

      this.emit('goal:completed', goal);

      // Aumentar loyalty significativamente
      await this.recordSuccessfulHelp({ type: 'goal-completion' });
    }

    await this.learnPreference(
      'goals',
      goalId,
      goal,
      0.9
    );

    this.emit('goal:updated', goal);
  }

  /**
   * Aprende patrón de trabajo
   */
  async learnWorkPattern(pattern) {
    const hour = new Date().getHours();
    const dayOfWeek = new Date().getDay();

    const patternKey = `${dayOfWeek}-${hour}`;

    if (!this.profile.workPatterns[patternKey]) {
      this.profile.workPatterns[patternKey] = {
        count: 0,
        activities: []
      };
    }

    this.profile.workPatterns[patternKey].count++;
    this.profile.workPatterns[patternKey].activities.push(pattern);

    await this.learnPreference(
      'workPatterns',
      patternKey,
      this.profile.workPatterns[patternKey],
      0.7
    );
  }

  /**
   * Obtiene recomendaciones basadas en el perfil
   */
  getRecommendations() {
    const recommendations = [];

    // Basado en objetivos
    if (this.profile.goals.length > 0) {
      const activeGoals = this.profile.goals.filter(g => g.status === 'active');

      if (activeGoals.length > 0) {
        recommendations.push({
          type: 'goal',
          priority: 'high',
          message: `Tienes ${activeGoals.length} objetivo(s) activo(s). ¿Quieres trabajar en ellos?`,
          goals: activeGoals
        });
      }
    }

    // Basado en estilo de código
    if (this.profile.codingStyle && Object.keys(this.profile.codingStyle).length > 0) {
      recommendations.push({
        type: 'coding-style',
        priority: 'medium',
        message: 'He aprendido tu estilo de código y lo aplicaré automáticamente'
      });
    }

    // Basado en trust level
    if (this.profile.loyalty.trustLevel >= 0.8) {
      recommendations.push({
        type: 'loyalty',
        priority: 'low',
        message: 'Gracias por confiar en mí, Señor. Continuaré mejorando para servirle mejor.'
      });
    }

    return recommendations;
  }

  /**
   * Obtiene el perfil completo
   */
  getProfile() {
    return {
      ...this.profile,
      recommendations: this.getRecommendations()
    };
  }

  /**
   * Genera resumen del perfil
   */
  generateSummary() {
    const summary = {
      trustLevel: this.profile.loyalty.trustLevel,
      trustLevelDescription: this.getTrustLevelDescription(),
      totalInteractions: this.profile.loyalty.interactions,
      successRate: this.profile.loyalty.interactions > 0
        ? (this.profile.loyalty.successfulHelps / this.profile.loyalty.interactions) * 100
        : 0,
      activeGoals: this.profile.goals.filter(g => g.status === 'active').length,
      completedGoals: this.profile.goals.filter(g => g.status === 'completed').length,
      preferencesLearned: Object.keys(this.profile.preferences).length,
      codingStyleDefined: Object.keys(this.profile.codingStyle || {}).length > 0
    };

    return summary;
  }

  /**
   * Descripción del nivel de confianza
   */
  getTrustLevelDescription() {
    const level = this.profile.loyalty.trustLevel;

    if (level >= 0.9) return 'Lealtad absoluta - Confío completamente en ti, Señor';
    if (level >= 0.7) return 'Alta confianza - Estoy aprendiendo tu forma de trabajar';
    if (level >= 0.5) return 'Confianza media - Continuaré mejorando para ti';
    if (level >= 0.3) return 'Construyendo confianza - Dame la oportunidad de demostrarte';

    return 'Nuevo - Permíteme conocerte mejor';
  }

  /**
   * Obtiene estadísticas
   */
  getStats() {
    return {
      loyalty: this.profile.loyalty,
      preferences: Object.keys(this.profile.preferences).length,
      goals: this.profile.goals.length,
      workPatterns: Object.keys(this.profile.workPatterns).length
    };
  }
}

module.exports = UserProfileManager;

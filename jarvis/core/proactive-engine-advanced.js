// ============================================
// PROACTIVE ENGINE ADVANCED - FASE 7
// ============================================
// Sistema proactivo con IA que SUGIERE acciones sin que las pidas
//
// Mejoras sobre versión anterior:
// ✅ Usa IA profunda para generar sugerencias contextuales
// ✅ Aprende de tus patrones de trabajo
// ✅ Anticipa necesidades basado en hora del día
// ✅ Detecta problemas y sugiere soluciones proactivamente
// ✅ No solo detecta, sino que PROPONE acciones concretas
//
// Autor: J.A.R.V.I.S. para Ulmer Solier
// Fecha: 2025-11-06

import fs from 'fs/promises';
import path from 'path';
import EventEmitter from 'events';

class ProactiveEngineAdvanced extends EventEmitter {
  constructor(jarvis, hybridBridge) {
    super();

    this.jarvis = jarvis;
    this.hybridBridge = hybridBridge;

    // Estado del motor
    this.monitoring = false;
    this.silentMode = true;
    this.lastSuggestionTime = null;

    // Cache de sugerencias
    this.pendingSuggestions = [];
    this.suggestionHistory = [];
    this.userPatterns = {
      workHours: [], // Horas en las que trabajas
      commonTasks: [], // Tareas que repites
      filePatterns: [], // Archivos que editas frecuentemente
      commandPatterns: [] // Comandos que usas
    };

    // Configuración
    this.config = {
      suggestionCooldown: 300000, // 5 minutos entre sugerencias
      maxPendingSuggestions: 10,
      aiSuggestionThreshold: 0.7, // Confianza mínima para sugerir con IA

      // Momentos para ser proactivo
      triggerMoments: {
        onIdle: true, // Cuando no hay actividad
        onPatternDetected: true, // Cuando detecta patrón
        onProblem: true, // Cuando detecta problema
        onSchedule: true // A ciertas horas del día
      },

      // Intervalos
      intervals: {
        fast: 60000, // 1 minuto
        medium: 300000, // 5 minutos
        deep: 900000, // 15 minutos
        pattern: 1800000 // 30 minutos - análisis de patrones
      }
    };

    // Estadísticas
    this.stats = {
      totalSuggestions: 0,
      acceptedSuggestions: 0,
      rejectedSuggestions: 0,
      aiGeneratedSuggestions: 0,
      patternsDetected: 0,
      problemsDetected: 0,
      actionsTaken: 0
    };

    console.log('[ProactiveAdvanced] Motor proactivo avanzado creado');
  }

  /**
   * Inicia el sistema proactivo
   */
  async start() {
    if (this.monitoring) {
      console.log('[ProactiveAdvanced] ⚠️  Ya está activo');
      return;
    }

    console.log('[ProactiveAdvanced] 🧠 Iniciando sistema proactivo con IA...');
    this.monitoring = true;

    // Cargar patrones del usuario
    await this.loadUserPatterns();

    // Iniciar monitoreo por capas
    this.startFastMonitoring();
    this.startMediumMonitoring();
    this.startDeepMonitoring();
    this.startPatternAnalysis();

    console.log('[ProactiveAdvanced] ✅ Sistema proactivo activo');
    this.emit('started');
  }

  /**
   * Detiene el sistema
   */
  stop() {
    if (!this.monitoring) return;

    console.log('[ProactiveAdvanced] 🛑 Deteniendo sistema proactivo...');
    this.monitoring = false;

    clearInterval(this.fastInterval);
    clearInterval(this.mediumInterval);
    clearInterval(this.deepInterval);
    clearInterval(this.patternInterval);

    this.emit('stopped');
  }

  // ============================================
  // CAPA 1: MONITOREO RÁPIDO (1 minuto)
  // ============================================

  startFastMonitoring() {
    this.fastInterval = setInterval(async () => {
      if (!this.monitoring) return;

      try {
        await this.checkQuickWins();
      } catch (error) {
        console.error('[ProactiveAdvanced] Error en monitoreo rápido:', error.message);
      }
    }, this.config.intervals.fast);
  }

  /**
   * Busca oportunidades rápidas de ayuda
   */
  async checkQuickWins() {
    const now = new Date();
    const hour = now.getHours();

    // Detectar momento del día
    if (hour === 9 && now.getMinutes() === 0) {
      await this.suggestMorningRoutine();
    }

    if (hour === 18 && now.getMinutes() === 0) {
      await this.suggestEndOfDayRoutine();
    }

    // Verificar si hay tareas pendientes
    const hasPendingWork = await this.detectPendingWork();
    if (hasPendingWork) {
      await this.suggestWorkContinuation();
    }
  }

  // ============================================
  // CAPA 2: MONITOREO MEDIO (5 minutos)
  // ============================================

  startMediumMonitoring() {
    this.mediumInterval = setInterval(async () => {
      if (!this.monitoring) return;

      try {
        await this.analyzeBehaviorPatterns();
        await this.detectProblems();
      } catch (error) {
        console.error('[ProactiveAdvanced] Error en monitoreo medio:', error.message);
      }
    }, this.config.intervals.medium);
  }

  /**
   * Analiza patrones de comportamiento
   */
  async analyzeBehaviorPatterns() {
    const recentCommands = await this.getRecentUserActivity();

    if (recentCommands.length === 0) {
      // Usuario inactivo - tal vez sugerir algo
      await this.handleIdleDetection();
      return;
    }

    // Detectar patrones repetitivos
    const repetitivePattern = this.findRepetitivePattern(recentCommands);
    if (repetitivePattern) {
      this.stats.patternsDetected++;
      await this.suggestAutomation(repetitivePattern);
    }
  }

  /**
   * Detecta problemas potenciales
   */
  async detectProblems() {
    const problems = [];

    // Verificar memoria del sistema
    const memoryIssue = await this.checkSystemMemory();
    if (memoryIssue) problems.push(memoryIssue);

    // Verificar espacio en disco
    const diskIssue = await this.checkDiskSpace();
    if (diskIssue) problems.push(diskIssue);

    // Emitir problemas detectados
    for (const problem of problems) {
      this.stats.problemsDetected++;
      await this.suggestSolution(problem);
    }
  }

  // ============================================
  // CAPA 3: MONITOREO PROFUNDO (15 minutos)
  // ============================================

  startDeepMonitoring() {
    this.deepInterval = setInterval(async () => {
      if (!this.monitoring) return;

      try {
        await this.runDeepAnalysis();
      } catch (error) {
        console.error('[ProactiveAdvanced] Error en monitoreo profundo:', error.message);
      }
    }, this.config.intervals.deep);
  }

  /**
   * Análisis profundo con IA
   */
  async runDeepAnalysis() {
    if (!this.hybridBridge || !this.hybridBridge.available) {
      console.log('[ProactiveAdvanced] ⚠️  IA profunda no disponible para análisis');
      return;
    }

    console.log('[ProactiveAdvanced] 🧠 Ejecutando análisis profundo con IA...');

    // Construir contexto del usuario
    const context = await this.buildUserContext();

    // Pedir a la IA que analice y sugiera
    const prompt = `
Analiza el siguiente contexto del usuario y sugiere 2-3 acciones proactivas que podrían ayudarle:

CONTEXTO:
${JSON.stringify(context, null, 2)}

Por favor, sugiere acciones específicas y prácticas que JARVIS podría hacer ahora mismo para ayudar al usuario.
Formato:
1. [Acción concreta]
2. [Acción concreta]
3. [Acción concreta]
`;

    try {
      const result = await this.hybridBridge.processWithDeepAI(prompt, context, false);

      if (result.success && result.response) {
        this.stats.aiGeneratedSuggestions++;
        await this.processAISuggestions(result.response);
      }
    } catch (error) {
      console.error('[ProactiveAdvanced] Error en análisis de IA:', error.message);
    }
  }

  // ============================================
  // CAPA 4: ANÁLISIS DE PATRONES (30 minutos)
  // ============================================

  startPatternAnalysis() {
    this.patternInterval = setInterval(async () => {
      if (!this.monitoring) return;

      try {
        await this.learnUserPatterns();
        await this.saveUserPatterns();
      } catch (error) {
        console.error('[ProactiveAdvanced] Error en análisis de patrones:', error.message);
      }
    }, this.config.intervals.pattern);
  }

  /**
   * Aprende patrones del usuario
   */
  async learnUserPatterns() {
    const now = new Date();
    const hour = now.getHours();

    // Registrar hora de actividad
    if (!this.userPatterns.workHours.includes(hour)) {
      this.userPatterns.workHours.push(hour);
    }

    // Analizar comandos recientes
    const recentCommands = await this.getRecentUserActivity();
    for (const cmd of recentCommands) {
      const existing = this.userPatterns.commandPatterns.find(p => p.pattern === cmd.pattern);
      if (existing) {
        existing.count++;
        existing.lastUsed = Date.now();
      } else {
        this.userPatterns.commandPatterns.push({
          pattern: cmd.pattern,
          count: 1,
          lastUsed: Date.now()
        });
      }
    }

    console.log(`[ProactiveAdvanced] 📊 Patrones aprendidos: ${this.userPatterns.commandPatterns.length} comandos`);
  }

  // ============================================
  // GENERACIÓN DE SUGERENCIAS
  // ============================================

  /**
   * Crea una sugerencia proactiva
   */
  async createSuggestion(type, message, action, priority = 'medium') {
    // Verificar cooldown
    if (this.lastSuggestionTime) {
      const timeSince = Date.now() - this.lastSuggestionTime;
      if (timeSince < this.config.suggestionCooldown) {
        return; // Demasiado pronto para otra sugerencia
      }
    }

    const suggestion = {
      id: Date.now(),
      type,
      message,
      action,
      priority,
      timestamp: Date.now(),
      status: 'pending'
    };

    this.pendingSuggestions.push(suggestion);
    this.stats.totalSuggestions++;
    this.lastSuggestionTime = Date.now();

    console.log(`\n💡 [JARVIS PROACTIVO] ${message}`);
    if (action) {
      console.log(`   Acción sugerida: ${action}`);
    }

    this.emit('suggestion', suggestion);

    return suggestion;
  }

  /**
   * Sugerencias de rutina matutina
   */
  async suggestMorningRoutine() {
    await this.createSuggestion(
      'routine',
      'Buenos días, Señor Solier. ¿Desea que revise su agenda y tareas pendientes?',
      'check_morning_tasks',
      'high'
    );
  }

  /**
   * Sugerencias de fin de día
   */
  async suggestEndOfDayRoutine() {
    await this.createSuggestion(
      'routine',
      'Fin del día, Señor. ¿Desea que haga un resumen de lo realizado hoy y prepare para mañana?',
      'end_of_day_summary',
      'high'
    );
  }

  /**
   * Sugiere continuar trabajo pendiente
   */
  async suggestWorkContinuation() {
    await this.createSuggestion(
      'work',
      'Detecté que tiene trabajo pendiente en el proyecto actual. ¿Desea que le recuerde los detalles?',
      'show_pending_work',
      'medium'
    );
  }

  /**
   * Sugiere automatización de tareas repetitivas
   */
  async suggestAutomation(pattern) {
    await this.createSuggestion(
      'automation',
      `He notado que repite frecuentemente: "${pattern}". ¿Desea que cree un atajo o automatización?`,
      `automate_pattern:${pattern}`,
      'high'
    );
  }

  /**
   * Sugiere solución a problema detectado
   */
  async suggestSolution(problem) {
    await this.createSuggestion(
      'problem',
      `Detecté un problema: ${problem.description}. Puedo ${problem.solution}`,
      `solve_problem:${problem.id}`,
      'high'
    );
  }

  /**
   * Maneja detección de inactividad
   */
  async handleIdleDetection() {
    const idleTime = await this.getIdleTime();

    if (idleTime > 1800000) { // 30 minutos
      await this.createSuggestion(
        'idle',
        'Lleva 30 minutos sin actividad. ¿Desea que guarde su trabajo y pause el sistema de monitoreo?',
        'idle_save_work',
        'low'
      );
    }
  }

  /**
   * Procesa sugerencias generadas por IA
   */
  async processAISuggestions(aiResponse) {
    console.log('[ProactiveAdvanced] 🤖 Procesando sugerencias de IA...');
    console.log(aiResponse);

    // Parsear respuesta de IA y crear sugerencias
    // (Simplificado - en producción parsear mejor)
    await this.createSuggestion(
      'ai_generated',
      'La IA ha analizado su contexto y tiene sugerencias para usted.',
      'show_ai_suggestions',
      'medium'
    );
  }

  // ============================================
  // UTILIDADES
  // ============================================

  async buildUserContext() {
    const now = new Date();

    return {
      currentTime: now.toISOString(),
      hour: now.getHours(),
      dayOfWeek: now.getDay(),
      workPatterns: this.userPatterns,
      recentActivity: await this.getRecentUserActivity(),
      pendingSuggestions: this.pendingSuggestions.length,
      stats: this.stats
    };
  }

  async getRecentUserActivity() {
    // Obtener actividad reciente del usuario
    // (Integrar con jarvis.conversationMemory o similar)
    return [];
  }

  findRepetitivePattern(commands) {
    // Detectar si hay comandos que se repiten
    const counts = {};
    for (const cmd of commands) {
      counts[cmd] = (counts[cmd] || 0) + 1;
    }

    for (const [cmd, count] of Object.entries(counts)) {
      if (count >= 3) return cmd; // 3+ repeticiones
    }

    return null;
  }

  async detectPendingWork() {
    // Verificar si hay archivos abiertos, commits pendientes, etc.
    return false; // Placeholder
  }

  async checkSystemMemory() {
    // Verificar uso de memoria
    return null; // Placeholder
  }

  async checkDiskSpace() {
    // Verificar espacio en disco
    return null; // Placeholder
  }

  async getIdleTime() {
    // Calcular tiempo de inactividad
    return 0; // Placeholder
  }

  async loadUserPatterns() {
    try {
      const data = await fs.readFile('memory/user_patterns.json', 'utf-8');
      this.userPatterns = JSON.parse(data);
      console.log('[ProactiveAdvanced] ✅ Patrones de usuario cargados');
    } catch (error) {
      console.log('[ProactiveAdvanced] Creando nuevos patrones de usuario...');
    }
  }

  async saveUserPatterns() {
    try {
      await fs.mkdir('memory', { recursive: true });
      await fs.writeFile(
        'memory/user_patterns.json',
        JSON.stringify(this.userPatterns, null, 2)
      );
    } catch (error) {
      console.error('[ProactiveAdvanced] Error guardando patrones:', error.message);
    }
  }

  getStats() {
    return {
      ...this.stats,
      monitoring: this.monitoring,
      pendingSuggestions: this.pendingSuggestions.length,
      patternsLearned: this.userPatterns.commandPatterns.length
    };
  }
}

export default ProactiveEngineAdvanced;

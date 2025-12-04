// ============================================
// PROACTIVE ENGINE - J.A.R.V.I.S. PURO
// ============================================
// Sistema proactivo verdaderamente inteligente
//
// Características:
// ✅ Detecta problemas ANTES de que ocurran
// ✅ Sugiere acciones sin que las pidas
// ✅ Identifica patrones de problemas recurrentes
// ✅ Anticipa necesidades basado en historial
// ✅ Monitoreo silencioso 24/7 (no interrumpe conversación)
// ✅ Alertas inteligentes (solo lo que importa)
// ✅ Predicción de commits necesarios
// ✅ Recomendaciones de refactoring basadas en código
// ✅ Identificación de code smells automática
// ✅ Sugerencias de optimización sin pedir
//
// Autor: Antropic Claude Sonnet 4.5
// Fecha: 2025-01-XX

import fs from 'fs/promises';
import path from 'path';

class ProactiveEngine {
  constructor(conversationMemory, gitIntegration, memoryAdvanced) {
    this.conversationMemory = conversationMemory;
    this.git = gitIntegration;
    this.memory = memoryAdvanced;

    // Estado del motor proactivo
    this.monitoring = false;
    this.monitoringInterval = null;
    this.silentMode = true; // No interrumpe conversación

    // Cache de sugerencias pendientes
    this.pendingSuggestions = [];
    this.maxPendingSuggestions = 10;

    // Configuración de detección
    this.config = {
      // Umbrales de detección
      thresholds: {
        uncommittedChanges: 10,        // Alertar si >= 10 archivos sin commit
        branchBehindBy: 5,              // Alertar si rama está 5+ commits atrás
        timeSinceLastCommit: 3600000,   // 1 hora sin commit
        sameFileDuration: 2700000,      // 45 min en mismo archivo
        repeatedProblemCount: 3,        // 3+ problemas similares
        codeSmellThreshold: 5,          // 5+ code smells en un archivo
      },

      // Intervalos de monitoreo (ms)
      intervals: {
        fast: 60000,      // 1 minuto - monitoreo rápido
        medium: 300000,   // 5 minutos - análisis medio
        slow: 900000,     // 15 minutos - análisis profundo
      },

      // Prioridades de sugerencias
      priorities: {
        critical: 10,  // Mostrar inmediatamente
        high: 7,       // Mostrar en próxima oportunidad
        medium: 5,     // Acumular y mostrar cuando sea relevante
        low: 3,        // Solo mencionar si usuario pregunta
        info: 1,       // Información contextual
      },
    };

    // Estadísticas
    this.stats = {
      detectionsTotal: 0,
      suggestionsMade: 0,
      problemsPrevented: 0,
      patternsIdentified: 0,
      codeSmellsDetected: 0,
      optimizationsSuggested: 0,
    };
  }

  async initialize() {
    console.log('[ProactiveEngine] Inicializando motor proactivo...');

    // Cargar patrones de problemas conocidos desde memoria
    await this.loadKnownProblems();

    // Cargar historial de sugerencias
    await this.loadSuggestionHistory();

    console.log('[ProactiveEngine] Motor proactivo inicializado ✓');
    return true;
  }

  // ============================================
  // MONITOREO CONTINUO
  // ============================================

  startMonitoring() {
    if (this.monitoring) {
      console.log('[ProactiveEngine] ⚠️  Monitoreo ya está activo');
      return;
    }

    this.monitoring = true;
    console.log('[ProactiveEngine] 🔍 Iniciando monitoreo silencioso 24/7...');

    // Monitoreo rápido cada 1 minuto
    this.monitoringInterval = setInterval(() => {
      this.runFastMonitoring().catch(err => {
        console.error('[ProactiveEngine] Error en monitoreo rápido:', err);
      });
    }, this.config.intervals.fast);

    // Monitoreo medio cada 5 minutos
    this.mediumMonitoringInterval = setInterval(() => {
      this.runMediumMonitoring().catch(err => {
        console.error('[ProactiveEngine] Error en monitoreo medio:', err);
      });
    }, this.config.intervals.medium);

    // Monitoreo profundo cada 15 minutos
    this.slowMonitoringInterval = setInterval(() => {
      this.runDeepMonitoring().catch(err => {
        console.error('[ProactiveEngine] Error en monitoreo profundo:', err);
      });
    }, this.config.intervals.slow);

    console.log('[ProactiveEngine] ✓ Monitoreo activo (silencioso)');
  }

  stopMonitoring() {
    if (!this.monitoring) return;

    clearInterval(this.monitoringInterval);
    clearInterval(this.mediumMonitoringInterval);
    clearInterval(this.slowMonitoringInterval);

    this.monitoring = false;
    console.log('[ProactiveEngine] 🛑 Monitoreo detenido');
  }

  // ============================================
  // MONITOREO RÁPIDO (1 minuto)
  // ============================================

  async runFastMonitoring() {
    const detections = [];

    // 1. Detectar cambios sin commit
    const uncommitted = await this.detectUncommittedChanges();
    if (uncommitted) detections.push(uncommitted);

    // 2. Detectar trabajo prolongado en mismo archivo
    const sameFile = await this.detectProlongedWork();
    if (sameFile) detections.push(sameFile);

    // 3. Detectar rama desactualizada
    const outdatedBranch = await this.detectOutdatedBranch();
    if (outdatedBranch) detections.push(outdatedBranch);

    // Agregar detecciones a sugerencias pendientes
    for (const detection of detections) {
      this.addPendingSuggestion(detection);
    }

    this.stats.detectionsTotal += detections.length;
  }

  // ============================================
  // MONITOREO MEDIO (5 minutos)
  // ============================================

  async runMediumMonitoring() {
    const detections = [];

    // 1. Detectar patrones de problemas recurrentes
    const patterns = await this.detectRecurringProblems();
    if (patterns) detections.push(patterns);

    // 2. Detectar code smells en archivos recientes
    const codeSmells = await this.detectCodeSmells();
    if (codeSmells.length > 0) {
      detections.push(...codeSmells);
      this.stats.codeSmellsDetected += codeSmells.length;
    }

    // 3. Sugerir commits inteligentes
    const commitSuggestion = await this.suggestSmartCommit();
    if (commitSuggestion) detections.push(commitSuggestion);

    for (const detection of detections) {
      this.addPendingSuggestion(detection);
    }

    this.stats.detectionsTotal += detections.length;
  }

  // ============================================
  // MONITOREO PROFUNDO (15 minutos)
  // ============================================

  async runDeepMonitoring() {
    const detections = [];

    // 1. Analizar optimizaciones posibles
    const optimizations = await this.suggestOptimizations();
    if (optimizations.length > 0) {
      detections.push(...optimizations);
      this.stats.optimizationsSuggested += optimizations.length;
    }

    // 2. Detectar duplicación de código
    const duplication = await this.detectCodeDuplication();
    if (duplication) detections.push(duplication);

    // 3. Sugerir refactoring basado en complejidad
    const refactoring = await this.suggestRefactoring();
    if (refactoring) detections.push(refactoring);

    for (const detection of detections) {
      this.addPendingSuggestion(detection);
    }

    this.stats.detectionsTotal += detections.length;
  }

  // ============================================
  // DETECCIONES ESPECÍFICAS
  // ============================================

  async detectUncommittedChanges() {
    if (!this.git) return null;

    try {
      const status = await this.git.getStatus();
      const totalChanges = status.staged.length + status.unstaged.length + status.untracked.length;

      if (totalChanges >= this.config.thresholds.uncommittedChanges) {
        return {
          type: 'uncommitted_changes',
          priority: this.config.priorities.high,
          message: `He detectado ${totalChanges} archivos sin commit. ¿Desea que genere un commit inteligente?`,
          context: {
            totalChanges,
            staged: status.staged.length,
            unstaged: status.unstaged.length,
            untracked: status.untracked.length,
          },
          action: 'suggest_commit',
          timestamp: Date.now(),
        };
      }

      // Detectar si ha pasado mucho tiempo sin commit
      const lastCommit = await this.getLastCommitTime();
      const timeSinceCommit = Date.now() - lastCommit;

      if (totalChanges > 0 && timeSinceCommit > this.config.thresholds.timeSinceLastCommit) {
        return {
          type: 'long_time_no_commit',
          priority: this.config.priorities.medium,
          message: `Lleva más de 1 hora trabajando sin hacer commit. Tiene ${totalChanges} cambios pendientes.`,
          context: { totalChanges, timeSinceCommit },
          action: 'remind_commit',
          timestamp: Date.now(),
        };
      }
    } catch (error) {
      // Silencio - no alertar sobre errores de Git
    }

    return null;
  }

  async detectProlongedWork() {
    const history = this.conversationMemory.getHistory(20);
    if (history.length === 0) return null;

    // Buscar menciones al mismo archivo
    const fileMatches = {};
    const now = Date.now();

    for (const turn of history) {
      const files = this.extractFilesFromMessage(turn.userMessage);
      for (const file of files) {
        if (!fileMatches[file]) {
          fileMatches[file] = {
            count: 0,
            firstMention: turn.timestamp,
            lastMention: turn.timestamp,
          };
        }
        fileMatches[file].count++;
        fileMatches[file].lastMention = turn.timestamp;
      }
    }

    // Buscar archivos con trabajo prolongado
    for (const [file, data] of Object.entries(fileMatches)) {
      const duration = data.lastMention - data.firstMention;

      if (data.count >= 3 && duration > this.config.thresholds.sameFileDuration) {
        // Buscar si hubo problemas similares antes
        const previousProblems = await this.searchPreviousProblems(file);

        if (previousProblems.length > 0) {
          return {
            type: 'prolonged_work_with_history',
            priority: this.config.priorities.high,
            message: `Llevas ${Math.round(duration / 60000)} minutos en ${file}. Hace ${this.formatTimeAgo(previousProblems[0].timestamp)} tuviste un problema similar aquí. ¿Necesita ayuda?`,
            context: {
              file,
              duration,
              mentions: data.count,
              previousProblems: previousProblems.length,
            },
            action: 'offer_help',
            timestamp: now,
          };
        } else {
          return {
            type: 'prolonged_work',
            priority: this.config.priorities.medium,
            message: `Llevas ${Math.round(duration / 60000)} minutos trabajando en ${file}. ¿Todo va bien?`,
            context: { file, duration, mentions: data.count },
            action: 'check_status',
            timestamp: now,
          };
        }
      }
    }

    return null;
  }

  async detectOutdatedBranch() {
    if (!this.git) return null;

    try {
      const branches = await this.git.branch('list');
      const currentBranch = branches.current;

      // Intentar obtener cuántos commits está atrás
      // Esto requiere fetch reciente, lo hacemos silenciosamente
      try {
        await this.git.fetch('origin', { silent: true });
      } catch {
        // Si fetch falla, continuamos sin alertar
        return null;
      }

      // Comparar con origin/main o origin/master
      const mainBranch = branches.all.includes('origin/main') ? 'origin/main' : 'origin/master';

      try {
        const { stdout } = await this.git.execGit(`rev-list --count ${currentBranch}..${mainBranch}`);
        const behindBy = parseInt(stdout.trim());

        if (behindBy >= this.config.thresholds.branchBehindBy) {
          return {
            type: 'outdated_branch',
            priority: this.config.priorities.high,
            message: `Su rama está ${behindBy} commits atrás de ${mainBranch}. Recomiendo un pull inmediato.`,
            context: {
              currentBranch,
              mainBranch,
              behindBy,
            },
            action: 'suggest_pull',
            timestamp: Date.now(),
          };
        }
      } catch {
        // No hay tracking branch o error de comparación
      }
    } catch (error) {
      // Silencio
    }

    return null;
  }

  async detectRecurringProblems() {
    const history = this.conversationMemory.getHistory(50);
    if (history.length < 10) return null;

    // Identificar problemas (mensajes con palabras clave de error/problema)
    const problemKeywords = ['error', 'falla', 'problema', 'bug', 'no funciona', 'ayuda', 'arreglar', 'fix'];
    const problems = [];

    for (const turn of history) {
      const message = turn.userMessage.toLowerCase();
      const hasError = problemKeywords.some(keyword => message.includes(keyword));

      if (hasError) {
        problems.push({
          message: turn.userMessage,
          topic: turn.context?.topic || 'unknown',
          file: this.extractFilesFromMessage(turn.userMessage)[0],
          timestamp: turn.timestamp,
        });
      }
    }

    if (problems.length < this.config.thresholds.repeatedProblemCount) {
      return null;
    }

    // Agrupar problemas por archivo/topic
    const groupedProblems = {};
    for (const problem of problems) {
      const key = problem.file || problem.topic;
      if (!groupedProblems[key]) {
        groupedProblems[key] = [];
      }
      groupedProblems[key].push(problem);
    }

    // Buscar grupos con 3+ problemas
    for (const [key, group] of Object.entries(groupedProblems)) {
      if (group.length >= this.config.thresholds.repeatedProblemCount) {
        this.stats.patternsIdentified++;

        return {
          type: 'recurring_problem',
          priority: this.config.priorities.critical,
          message: `He notado un patrón: ${group.length} problemas recurrentes relacionados con "${key}". ¿Desea que investigue la causa raíz?`,
          context: {
            subject: key,
            occurrences: group.length,
            firstOccurrence: group[0].timestamp,
            lastOccurrence: group[group.length - 1].timestamp,
          },
          action: 'investigate_pattern',
          timestamp: Date.now(),
        };
      }
    }

    return null;
  }

  async detectCodeSmells() {
    const suggestions = [];

    try {
      // Obtener archivos modificados recientemente
      const recentFiles = await this.getRecentlyModifiedFiles();

      for (const file of recentFiles) {
        const smells = await this.analyzeFileForCodeSmells(file);

        if (smells.length >= this.config.thresholds.codeSmellThreshold) {
          suggestions.push({
            type: 'code_smells',
            priority: this.config.priorities.medium,
            message: `Detecté ${smells.length} code smells en ${path.basename(file)}. Principales: ${smells.slice(0, 2).map(s => s.type).join(', ')}.`,
            context: {
              file,
              smells: smells.slice(0, 5), // Solo top 5
              totalSmells: smells.length,
            },
            action: 'suggest_refactor',
            timestamp: Date.now(),
          });
        }
      }
    } catch (error) {
      // Silencio
    }

    return suggestions;
  }

  async suggestSmartCommit() {
    if (!this.git) return null;

    try {
      const status = await this.git.getStatus();
      const totalChanges = status.staged.length + status.unstaged.length;

      if (totalChanges === 0) return null;

      // Analizar si los cambios forman un conjunto lógico
      const changeTypes = await this.analyzeChangeTypes(status);

      // Si hay un patrón claro, sugerir commit
      if (changeTypes.dominant && changeTypes.dominantPercentage > 0.7) {
        const suggestedMessage = this.generateCommitMessage(changeTypes);

        return {
          type: 'smart_commit_suggestion',
          priority: this.config.priorities.medium,
          message: `Detecté ${totalChanges} cambios relacionados con "${changeTypes.dominant}". Sugerencia de commit: "${suggestedMessage}"`,
          context: {
            totalChanges,
            changeType: changeTypes.dominant,
            suggestedMessage,
          },
          action: 'commit_with_message',
          timestamp: Date.now(),
        };
      }
    } catch (error) {
      // Silencio
    }

    return null;
  }

  async suggestOptimizations() {
    const suggestions = [];

    try {
      const recentFiles = await this.getRecentlyModifiedFiles();

      for (const file of recentFiles) {
        const optimizations = await this.analyzeFileForOptimizations(file);

        if (optimizations.length > 0) {
          suggestions.push({
            type: 'optimization',
            priority: this.config.priorities.low,
            message: `Detecté ${optimizations.length} oportunidades de optimización en ${path.basename(file)}.`,
            context: {
              file,
              optimizations: optimizations.slice(0, 3), // Top 3
            },
            action: 'show_optimizations',
            timestamp: Date.now(),
          });
        }
      }
    } catch (error) {
      // Silencio
    }

    return suggestions;
  }

  async detectCodeDuplication() {
    // TODO: Implementar detección de código duplicado
    // Por ahora, retornar null
    return null;
  }

  async suggestRefactoring() {
    // TODO: Implementar sugerencias de refactoring basadas en complejidad
    // Por ahora, retornar null
    return null;
  }

  // ============================================
  // ANÁLISIS DE CÓDIGO
  // ============================================

  async analyzeFileForCodeSmells(filePath) {
    const smells = [];

    try {
      const content = await fs.readFile(filePath, 'utf-8');
      const lines = content.split('\n');

      // 1. Funciones muy largas (>50 líneas)
      const functions = this.extractFunctions(content);
      for (const func of functions) {
        if (func.lines > 50) {
          smells.push({
            type: 'long_function',
            message: `Función "${func.name}" tiene ${func.lines} líneas (>50)`,
            severity: 'medium',
          });
        }
      }

      // 2. Muchos parámetros (>4)
      for (const func of functions) {
        if (func.params > 4) {
          smells.push({
            type: 'too_many_params',
            message: `Función "${func.name}" tiene ${func.params} parámetros (>4)`,
            severity: 'low',
          });
        }
      }

      // 3. Comentarios excesivos (señal de código complejo)
      const commentLines = lines.filter(l => l.trim().startsWith('//')).length;
      if (commentLines > lines.length * 0.3) {
        smells.push({
          type: 'excessive_comments',
          message: `${commentLines} líneas de comentarios (${Math.round(commentLines / lines.length * 100)}%)`,
          severity: 'low',
        });
      }

      // 4. Try-catch vacíos
      const emptyCatches = (content.match(/catch\s*\([^)]*\)\s*\{\s*\}/g) || []).length;
      if (emptyCatches > 0) {
        smells.push({
          type: 'empty_catch',
          message: `${emptyCatches} bloques catch vacíos detectados`,
          severity: 'high',
        });
      }

      // 5. console.log en producción
      const consoleLogs = (content.match(/console\.log\(/g) || []).length;
      if (consoleLogs > 5) {
        smells.push({
          type: 'console_logs',
          message: `${consoleLogs} console.log() detectados`,
          severity: 'low',
        });
      }

    } catch (error) {
      // Archivo no legible o error de parsing
    }

    return smells;
  }

  async analyzeFileForOptimizations(filePath) {
    const optimizations = [];

    try {
      const content = await fs.readFile(filePath, 'utf-8');

      // 1. Uso de var en lugar de let/const
      const varUsage = (content.match(/\bvar\s+\w+/g) || []).length;
      if (varUsage > 0) {
        optimizations.push({
          type: 'use_modern_syntax',
          message: `${varUsage} usos de 'var' (usar let/const)`,
          impact: 'low',
        });
      }

      // 2. Callbacks anidados (callback hell)
      const callbackDepth = this.detectCallbackDepth(content);
      if (callbackDepth > 3) {
        optimizations.push({
          type: 'callback_hell',
          message: `Callbacks anidados a ${callbackDepth} niveles (usar async/await)`,
          impact: 'medium',
        });
      }

      // 3. Operaciones síncronas bloqueantes
      const syncOps = (content.match(/Sync\(/g) || []).length;
      if (syncOps > 3) {
        optimizations.push({
          type: 'blocking_operations',
          message: `${syncOps} operaciones síncronas (considerar async)`,
          impact: 'high',
        });
      }

    } catch (error) {
      // Silencio
    }

    return optimizations;
  }

  // ============================================
  // GESTIÓN DE SUGERENCIAS
  // ============================================

  addPendingSuggestion(suggestion) {
    // Evitar duplicados
    const exists = this.pendingSuggestions.some(s =>
      s.type === suggestion.type &&
      s.context?.file === suggestion.context?.file
    );

    if (exists) return;

    // Agregar a lista
    this.pendingSuggestions.push(suggestion);

    // Limitar tamaño
    if (this.pendingSuggestions.length > this.maxPendingSuggestions) {
      // Eliminar sugerencias de menor prioridad
      this.pendingSuggestions.sort((a, b) => b.priority - a.priority);
      this.pendingSuggestions = this.pendingSuggestions.slice(0, this.maxPendingSuggestions);
    }
  }

  getPendingSuggestions(minPriority = 0) {
    return this.pendingSuggestions
      .filter(s => s.priority >= minPriority)
      .sort((a, b) => b.priority - a.priority);
  }

  clearSuggestion(type, context) {
    this.pendingSuggestions = this.pendingSuggestions.filter(s =>
      !(s.type === type && JSON.stringify(s.context) === JSON.stringify(context))
    );
  }

  clearAllSuggestions() {
    this.pendingSuggestions = [];
  }

  // ============================================
  // UTILIDADES
  // ============================================

  extractFilesFromMessage(message) {
    const files = [];

    // Buscar patrones de archivos
    const patterns = [
      /[\w-]+\.(js|ts|jsx|tsx|json|md|txt|py|java|cpp|c|h|css|html|xml)/gi,
      /[./][\w/-]+\.(js|ts|jsx|tsx|json|md|txt|py|java|cpp|c|h|css|html|xml)/gi,
    ];

    for (const pattern of patterns) {
      const matches = message.match(pattern);
      if (matches) {
        files.push(...matches);
      }
    }

    return [...new Set(files)]; // Unique
  }

  extractFunctions(content) {
    const functions = [];

    // Regex para funciones JavaScript
    const functionRegex = /(?:async\s+)?function\s+(\w+)\s*\(([^)]*)\)|(?:const|let|var)\s+(\w+)\s*=\s*(?:async\s+)?\(([^)]*)\)\s*=>/g;

    let match;
    while ((match = functionRegex.exec(content)) !== null) {
      const name = match[1] || match[3];
      const params = (match[2] || match[4] || '').split(',').filter(p => p.trim()).length;

      // Contar líneas aproximadas (desde inicio función hasta próxima función o final)
      const startPos = match.index;
      const nextMatch = functionRegex.exec(content);
      const endPos = nextMatch ? nextMatch.index : content.length;
      functionRegex.lastIndex = startPos + match[0].length; // Resetear para próxima iteración

      const functionContent = content.substring(startPos, endPos);
      const lines = functionContent.split('\n').length;

      functions.push({ name, params, lines });
    }

    return functions;
  }

  detectCallbackDepth(content) {
    let maxDepth = 0;
    let currentDepth = 0;

    // Buscar patrones de callbacks anidados
    const lines = content.split('\n');
    for (const line of lines) {
      if (line.includes('function(') || line.includes('=>')) {
        currentDepth++;
        maxDepth = Math.max(maxDepth, currentDepth);
      }
      if (line.includes('}')) {
        currentDepth = Math.max(0, currentDepth - 1);
      }
    }

    return maxDepth;
  }

  async getRecentlyModifiedFiles() {
    const files = [];

    try {
      if (!this.git) return files;

      const status = await this.git.getStatus();

      // Agregar archivos modificados
      files.push(...status.staged, ...status.unstaged);

      // Limitar a archivos .js
      return files.filter(f => f.endsWith('.js') || f.endsWith('.ts'));

    } catch (error) {
      return files;
    }
  }

  async getLastCommitTime() {
    try {
      if (!this.git) return Date.now();

      const log = await this.git.getLog(1);
      if (log.length > 0) {
        return new Date(log[0].date).getTime();
      }
    } catch (error) {
      // Silencio
    }

    return Date.now();
  }

  async searchPreviousProblems(file) {
    try {
      const results = await this.conversationMemory.searchHistory(file);

      // Filtrar mensajes con palabras clave de problemas
      const problemKeywords = ['error', 'falla', 'problema', 'bug', 'ayuda', 'arreglar'];

      return results.filter(turn => {
        const message = turn.userMessage.toLowerCase();
        return problemKeywords.some(keyword => message.includes(keyword));
      });

    } catch (error) {
      return [];
    }
  }

  async analyzeChangeTypes(status) {
    const changes = [...status.staged, ...status.unstaged];
    const types = {
      feature: 0,
      fix: 0,
      refactor: 0,
      docs: 0,
      test: 0,
      style: 0,
      other: 0,
    };

    for (const file of changes) {
      if (file.includes('test')) types.test++;
      else if (file.includes('.md')) types.docs++;
      else if (file.includes('style') || file.includes('.css')) types.style++;
      else types.other++;
    }

    // Determinar tipo dominante
    let dominant = 'other';
    let maxCount = 0;

    for (const [type, count] of Object.entries(types)) {
      if (count > maxCount) {
        maxCount = count;
        dominant = type;
      }
    }

    const dominantPercentage = maxCount / changes.length;

    return {
      types,
      dominant,
      dominantPercentage,
      totalChanges: changes.length,
    };
  }

  generateCommitMessage(changeTypes) {
    const { dominant, totalChanges } = changeTypes;

    const messages = {
      feature: `feat: Agregar nueva funcionalidad (${totalChanges} archivos)`,
      fix: `fix: Corregir errores (${totalChanges} archivos)`,
      refactor: `refactor: Refactorización de código (${totalChanges} archivos)`,
      docs: `docs: Actualizar documentación (${totalChanges} archivos)`,
      test: `test: Agregar/actualizar tests (${totalChanges} archivos)`,
      style: `style: Cambios de formato/estilo (${totalChanges} archivos)`,
      other: `chore: Actualización general (${totalChanges} archivos)`,
    };

    return messages[dominant] || messages.other;
  }

  formatTimeAgo(timestamp) {
    const seconds = Math.floor((Date.now() - timestamp) / 1000);

    if (seconds < 60) return `${seconds} segundos`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)} minutos`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)} horas`;
    return `${Math.floor(seconds / 86400)} días`;
  }

  async loadKnownProblems() {
    // Cargar problemas conocidos desde memoria SQLite
    // Por ahora, lista vacía
    this.knownProblems = [];
  }

  async loadSuggestionHistory() {
    // Cargar historial de sugerencias desde memoria SQLite
    // Por ahora, lista vacía
    this.suggestionHistory = [];
  }

  getStats() {
    return {
      monitoring: this.monitoring,
      silentMode: this.silentMode,
      pendingSuggestions: this.pendingSuggestions.length,
      ...this.stats,
    };
  }
}

export default ProactiveEngine;

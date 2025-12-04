// core/jarvis-pure.js
// J.A.R.V.I.S. PURO - Sistema completamente autónomo sin IA externa
// El verdadero JARVIS: razonamiento propio + NLP propio + decisiones autónomas

import DecisionEngine from './decision-engine.js';
import Memory from './memory.js';
import MemoryAdvanced from './memory-advanced.js';
import Personality from './personality.js';
import Security from './security.js';
import Logger from '../utils/logger.js';
import GitIntegration from './git-integration.js';
import MonitorIntegration from './monitor-integration.js';
import JarvisConversationalMain from './jarvis-conversational-main.js';
import UniversalExecutor from './universal-executor.js';
import CodeAnalyzer from './code-analyzer.js';
import actionsLoader from '../actions/index.js';
import HybridBridge from './hybrid_bridge.js';
import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs';

const execAsync = promisify(exec);

class JarvisPure {
  constructor() {
    this.identity = {
      name: 'J.A.R.V.I.S. PURO',
      version: '1.0.0',
      mode: 'autonomous',
      status: 'DESPERTANDO'
    };

    // Componentes del sistema
    this.memory = new Memory();
    this.memoryAdvanced = new MemoryAdvanced();
    this.personality = new Personality();
    this.security = new Security();
    this.logger = new Logger();
    this.git = new GitIntegration();
    this.monitor = new MonitorIntegration(this);

    // Sistema Conversacional Completo (FASE 4)
    this.conversationalSystem = null;

    // Módulos de Omnipotencia (FASE 5)
    this.universalExecutor = null;
    this.codeAnalyzer = null;

    // Puente Híbrido JS ↔ Python (IA Profunda)
    this.hybridBridge = null;

    // Motor de decisión (el cerebro)
    this.decisionEngine = null;

    // Estado interno
    this.isReady = false;
    this.commandHistory = [];
    this.proactiveSuggestions = [];

    // Contexto conversacional de corto plazo
    this.conversationContext = {
      lastUserMessage: null,
      lastJarvisResponse: null,
      lastTopic: null,
      lastIntent: null,
      conversationFlow: []
    };
  }

  /**
   * Inicializa J.A.R.V.I.S. PURO
   */
  async initialize() {
    console.clear();

    this.logger.banner('J.A.R.V.I.S. PURO - MODO AUTÓNOMO');

    console.log('\n⚡ Iniciando sistema de razonamiento propio...\n');

    try {
      // FASE 1: Seguridad
      await this.security.initialize();
      this.logger.success('✅ Protocolos de Seguridad: ACTIVOS');

      // FASE 2: Memoria básica
      await this.memory.initialize();
      this.logger.success('✅ Memoria Básica: EN LÍNEA');

      // FASE 3: Memoria avanzada
      await this.memoryAdvanced.initialize();
      this.logger.success('✅ Memoria Avanzada: EN LÍNEA');

      // FASE 4: Motor de decisión (el cerebro)
      this.decisionEngine = new DecisionEngine(this.memoryAdvanced, this.personality);
      this.logger.success('✅ Motor de Decisión Autónoma: OPERACIONAL');

      // FASE 5: Git Integration
      await this.git.initialize();
      this.logger.success('✅ Git Integration: OPERACIONAL');

      // FASE 6: Monitor Autónomo
      await this.monitor.initialize(this.git, this.memoryAdvanced);
      this.monitor.start();
      this.logger.success('✅ Monitor Autónomo: ACTIVO (tareas cada 5min/1h/diario)');

      // FASE 7: Sistema Conversacional OMNIPOTENTE (FASE 4)
      this.conversationalSystem = new JarvisConversationalMain(this);
      await this.conversationalSystem.initialize();

      this.logger.success('✅ Sistema Conversacional OMNIPOTENTE: OPERACIONAL (7 módulos integrados)');

      // FASE 8: Módulos de Omnipotencia (FASE 5)
      console.log('\n⚡ Cargando módulos de OMNIPOTENCIA TOTAL...');

      this.universalExecutor = new UniversalExecutor();
      this.logger.success('✅ Universal Executor: OPERACIONAL (ejecuta cualquier comando)');

      this.codeAnalyzer = new CodeAnalyzer();
      this.logger.success('✅ Code Analyzer: OPERACIONAL (entiende código como expert)');

      // FASE 9: Cargar personalidad
      this.identity.masterUser = process.env.MASTER_USER || 'Ulmer Solier';
      this.logger.success(`✅ Personalidad Ulmer Solier: CALIBRADA`);

      // FASE 10: Cargar sistema de acciones reales
      await actionsLoader.initialize();
      this.logger.success(`✅ Sistema de Acciones: ${actionsLoader.getActionCount()} acciones disponibles`);

      // FASE 11: Inicializar Puente Híbrido JS ↔ Python (IA Profunda)
      this.hybridBridge = new HybridBridge();
      const pythonAvailable = await this.hybridBridge.initialize();

      if (pythonAvailable) {
        this.logger.success('✅ Motor de IA Profunda (Python + Ollama): CONECTADO');
      } else {
        this.logger.warn('⚠️  Motor de IA Profunda: NO DISPONIBLE (continuando con JS)');
      }

      // FASE 12: Auto-diagnóstico
      await this.selfDiagnostic();

      this.identity.status = 'OPERACIONAL';
      this.isReady = true;

      this.showWelcome();

      return true;

    } catch (error) {
      this.logger.error(`❌ Error al inicializar: ${error.message}`);
      return false;
    }
  }

  /**
   * Auto-diagnóstico del sistema
   */
  async selfDiagnostic() {
    console.log('\n🔍 Realizando auto-diagnóstico...');

    const checks = [
      { name: 'Filesystem', test: () => fs.existsSync('.') },
      { name: 'Node.js', test: () => process.version !== null },
      { name: 'Memoria SQLite', test: () => this.memory.db !== null },
      { name: 'Motor NLP', test: () => this.decisionEngine.nlp !== null },
      { name: 'Motor Reasoning', test: () => this.decisionEngine.reasoning !== null },
    ];

    for (const check of checks) {
      try {
        const result = check.test();
        if (result) {
          console.log(`   ✓ ${check.name}: OK`);
        } else {
          console.log(`   ✗ ${check.name}: FALLO`);
        }
      } catch (error) {
        console.log(`   ✗ ${check.name}: ERROR`);
      }
    }
  }

  /**
   * Muestra bienvenida con personalidad
   */
  showWelcome() {
    console.log('\n' + '═'.repeat(60));
    console.log('\n🎩 ' + this.personality.getGreeting());
    console.log('\n💡 JARVIS PURO está completamente operacional.');
    console.log('   - Motor de Razonamiento: ✅');
    console.log('   - Procesamiento NLP Propio: ✅');
    console.log('   - Decisiones Autónomas: ✅');
    console.log('   - Sin dependencias de IA externa: ✅');

    console.log('\n📋 Diga lo que necesite, Señor. Yo decidiré cómo hacerlo.');
    console.log('   (Escriba "ayuda" para ver capacidades completas)');
    console.log('\n' + '═'.repeat(60));
  }

  /**
   * Procesa un comando del usuario
   * Este es el flujo principal de JARVIS PURO
   */
  async processCommand(userMessage) {
    if (!this.isReady) {
      return '⚠️  Sistema todavía despertando. Un momento, Señor Solier...';
    }

    if (!userMessage || !userMessage.trim()) {
      return null;
    }

    const command = userMessage.trim();

    // Guardar contexto del mensaje anterior
    this.conversationContext.lastUserMessage = command;

    // Guardar en historial
    this.commandHistory.push({
      message: command,
      timestamp: new Date()
    });

    try {
      // COMANDO ESPECIAL: Salir
      if (/^(salir|exit|quit)$/i.test(command)) {
        return await this.shutdown();
      }

      // COMANDO ESPECIAL: Ayuda
      if (/^(ayuda|help|\?)$/i.test(command)) {
        return this.showHelp();
      }

      // COMANDO ESPECIAL: Estado
      if (/^(estado|status|info)$/i.test(command)) {
        return this.showStatus();
      }

      // COMANDO ESPECIAL: Análisis
      if (/^(analiza|analyze)\s+(.+)$/i.test(command)) {
        return await this.analyzeCommand(command);
      }

      // COMANDO ESPECIAL: Saludos (incluyendo "cómo estás" sin saludo previo)
      if (/^(hola|hello|hi|hey|buenos días|buenas tardes|buenas noches)/i.test(command) ||
          /^c[óo]mo\s+(est[áa]s|te\s+encuentras|andas)/i.test(command)) {
        return this.handleGreeting(command);
      }

      // COMANDO ESPECIAL: Preguntas de seguimiento simples
      if (this.isSimpleFollowUpQuestion(command)) {
        return this.handleFollowUpQuestion(command);
      }

      // FLUJO PRINCIPAL: Decisión Autónoma
      return await this.autonomousProcess(command);

    } catch (error) {
      this.logger.error(`Error procesando comando: ${error.message}`);
      return this.handleError(error, command);
    }
  }

  /**
   * PROCESO AUTÓNOMO PRINCIPAL
   * Aquí es donde JARVIS decide qué hacer sin intervención
   */
  async autonomousProcess(userMessage) {
    console.log('\n' + '─'.repeat(60));
    console.log('🧠 JARVIS PURO - Modo Autónomo Activado');
    console.log('─'.repeat(60));

    // FASE 1: Análisis y decisión (usando DecisionEngine)
    const result = await this.decisionEngine.processAndDecide(userMessage);

    const { decision, response, analysis } = result;

    // FASE 2: Mostrar análisis (modo debug)
    if (process.env.DEBUG) {
      console.log('\n📊 ANÁLISIS COMPLETO:');
      console.log('   NLP:', analysis.nlp.questionType);
      console.log('   Razonamiento:', analysis.reasoning.intent);
      console.log('   Decisión:', decision.chosenAction.type);
      console.log('   Confianza:', (decision.confidence * 100).toFixed(0) + '%');
    }

    // FASE 2.5: DECISIÓN DE PROCESAMIENTO - IA Profunda vs JavaScript
    // Determinar si necesitamos IA profunda (Python + Ollama) o JavaScript es suficiente
    const needsDeepAI = this.hybridBridge?.needsDeepAI(userMessage, analysis);

    if (needsDeepAI && this.hybridBridge?.available) {
      console.log('\n🧠 Usando Motor de IA Profunda (Python + Ollama)...');

      const deepAIResult = await this.hybridBridge.processWithDeepAI(
        userMessage,
        {
          nlp: analysis.nlp,
          reasoning: analysis.reasoning,
          intent: analysis.reasoning.intent,
          topic: analysis.reasoning.topic,
        },
        true // usar historial conversacional
      );

      if (deepAIResult.success) {
        console.log(`   ✅ Procesado con ${deepAIResult.model} en ${deepAIResult.responseTime.toFixed(2)}s`);

        // Guardar contexto conversacional
        this.conversationContext.lastJarvisResponse = deepAIResult.response;
        this.conversationContext.lastTopic = analysis.reasoning.topic || 'general';

        // Guardar en memoria
        await this.saveToMemory(userMessage, deepAIResult.response, analysis);

        console.log('─'.repeat(60) + '\n');
        return deepAIResult.response;
      } else {
        console.log('   ⚠️  IA Profunda falló, usando fallback JavaScript...');
        // Continuar con procesamiento JavaScript normal
      }
    } else if (needsDeepAI && !this.hybridBridge?.available) {
      console.log('\n💡 Este mensaje se beneficiaría de IA profunda, pero no está disponible.');
      console.log('   Procesando con capacidades JavaScript...');
    }

    // FASE 3: Ejecutar acción (si no requiere confirmación)
    let executionResult = null;

    if (response.shouldExecute) {
      console.log('\n⚡ Ejecutando acción automáticamente...');
      executionResult = await this.executeAction(decision.chosenAction, userMessage, analysis);
    }

    // FASE 4: Construir respuesta base
    let baseResponse = response.message;

    if (executionResult) {
      baseResponse += '\n\n' + '─'.repeat(60);
      baseResponse += '\n📋 RESULTADO:\n';
      baseResponse += executionResult;
    }

    // FASE 5 & 6: Procesamiento conversacional OMNIPOTENTE (FASE 4)
    let finalResponse = baseResponse;

    if (this.conversationalSystem) {
      // El sistema conversacional aplica:
      // 1. Detección de emociones
      // 2. Inteligencia emocional
      // 3. Respuestas naturales con personalidad
      // 4. Memoria conversacional
      // 5. Análisis NLP conversacional avanzado
      finalResponse = await this.conversationalSystem.generateResponse(
        baseResponse,
        {
          userMessage,
          intent: analysis.reasoning.intent,
          entities: analysis.nlp.entities || {},
          confidence: decision.confidence,
          topic: analysis.reasoning.topic || 'general',
          project: analysis.context?.currentProject || null,
          action: decision.chosenAction.type,
          error: response.error || false,
          urgent: decision.confidence > 0.9,
          emotion: 'neutral', // ← FIX: Añadir emotion por defecto
        }
      );
    }

    // FASE 7: Guardar en memoria básica (backward compatibility)
    await this.saveToMemory(userMessage, finalResponse, analysis);

    console.log('─'.repeat(60) + '\n');

    return finalResponse;
  }

  /**
   * Ejecuta la acción decidida
   */
  async executeAction(action, originalMessage, analysis) {
    const { type } = action;

    // PRIMERO: Intentar con el sistema de acciones reales
    if (actionsLoader.hasAction(type)) {
      try {
        const params = this.extractActionParams(originalMessage, analysis, type);
        const result = await actionsLoader.execute(type, params);

        if (result.success) {
          return this.formatActionResult(result, type);
        } else {
          return `❌ Error en acción '${type}': ${result.error}`;
        }
      } catch (error) {
        console.error(`Error ejecutando acción '${type}':`, error);
        // Continuar con fallback
      }
    }

    // SEGUNDO: Intentar mapeo de intenciones a acciones
    const mappedAction = actionsLoader.mapIntentToAction(type);
    if (mappedAction !== type && actionsLoader.hasAction(mappedAction)) {
      try {
        const params = this.extractActionParams(originalMessage, analysis, mappedAction);
        const result = await actionsLoader.execute(mappedAction, params);

        if (result.success) {
          return this.formatActionResult(result, mappedAction);
        }
      } catch (error) {
        console.error(`Error ejecutando acción mapeada '${mappedAction}':`, error);
      }
    }

    // TERCERO: Fallback a ejecutores legacy
    const executors = {
      'search_filesystem': () => this.searchFilesystem(originalMessage, analysis),
      'list_directory': () => this.listDirectory(originalMessage, analysis),
      'display_file': () => this.displayFile(originalMessage, analysis),
      'run_command': () => this.runCommand(originalMessage, analysis),
      'query_memory': () => this.queryMemory(originalMessage, analysis),
      'show_stats': () => this.showSystemStats(),
      'diagnostic': () => this.runDiagnostic(),
      'provide_help': () => this.showDetailedHelp(analysis),
      'ask_clarification': () => this.askClarification(analysis),
      'diagnostic_analysis': () => this.runDiagnostic(),
      'system_check': () => this.runDiagnostic(),
      'show_history': () => this.queryMemory(originalMessage, analysis),
      // GIT COMMANDS
      'git_status': () => this.gitStatus(),
      'git_log': () => this.gitLog(originalMessage),
      'git_commit': () => this.gitCommit(originalMessage),
      'git_push': () => this.gitPush(),
      'git_pull': () => this.gitPull(),
      'git_diff': () => this.gitDiff(originalMessage),
      'git_branch': () => this.gitBranch(originalMessage),
      // GITHUB COMMANDS
      'github_repos': () => this.githubRepos(),
      'github_issues': () => this.githubIssues(originalMessage),
      'github_create_issue': () => this.githubCreateIssue(originalMessage),
      'github_prs': () => this.githubPullRequests(originalMessage),
    };

    let executor = executors[type];

    if (!executor) {
      // Buscar coincidencias parciales
      if (type.includes('search') || type.includes('busca')) {
        executor = executors['search_filesystem'];
      } else if (type.includes('list') || type.includes('lista')) {
        executor = executors['list_directory'];
      } else if (type.includes('show') || type.includes('muestra') || type.includes('display')) {
        executor = executors['display_file'];
      } else if (type.includes('memory') || type.includes('memoria') || type.includes('recuerda')) {
        executor = executors['query_memory'];
      } else if (type.includes('diagnostic') || type.includes('analiza') || type.includes('analyze')) {
        executor = executors['diagnostic'];
      } else if (type.includes('help') || type.includes('ayuda')) {
        executor = executors['provide_help'];
      }
    }

    if (executor) {
      try {
        return await executor();
      } catch (error) {
        return `❌ Error ejecutando '${type}': ${error.message}`;
      }
    } else {
      return `⚠️  Acción '${type}' reconocida pero no implementada aún.\n` +
             `Acciones disponibles: ${actionsLoader.listActions().map(a => a.name).join(', ')}`;
    }
  }

  /**
   * Extrae parámetros para una acción desde el mensaje y análisis
   */
  extractActionParams(message, analysis, actionType) {
    const params = {};

    // Parámetros generales
    if (analysis.nlp?.entities) {
      params.entities = analysis.nlp.entities;
    }

    // Parámetros específicos por tipo de acción
    switch (actionType) {
      case 'create_project':
        params.projectName = this.extractProjectName(message, analysis);
        params.template = this.extractTemplate(message);
        params.author = 'Ulmer Solier';
        break;

      case 'system_monitor':
        params.type = this.extractMonitorType(message);
        params.detailed = message.includes('detallado') || message.includes('detailed');
        break;

      case 'weather_report':
        params.location = this.extractLocation(message, analysis);
        break;

      case 'screenshot':
        params.filename = `screenshot_${Date.now()}`;
        break;

      case 'joke':
        params.category = this.extractJokeCategory(message);
        params.count = this.extractNumber(message) || 1;
        break;
    }

    return params;
  }

  /**
   * Formatea el resultado de una acción para mostrar al usuario
   */
  formatActionResult(result, actionType) {
    if (result.summary) {
      return result.summary;
    }

    if (result.message) {
      return result.message;
    }

    if (actionType === 'joke' && result.jokes) {
      return result.jokes.join('\n\n');
    }

    return JSON.stringify(result, null, 2);
  }

  // Helpers para extraer parámetros
  extractProjectName(message, analysis) {
    const match = message.match(/proyecto\s+(\S+)|project\s+(\S+)|llamado\s+(\S+)|named\s+(\S+)/i);
    return match ? (match[1] || match[2] || match[3] || match[4]) : 'nuevo-proyecto';
  }

  extractTemplate(message) {
    if (message.includes('express')) return 'express';
    if (message.includes('react')) return 'react';
    if (message.includes('cli')) return 'cli';
    return 'node';
  }

  extractMonitorType(message) {
    if (message.includes('cpu')) return 'cpu';
    if (message.includes('memoria') || message.includes('ram')) return 'memory';
    if (message.includes('batería') || message.includes('battery')) return 'battery';
    if (message.includes('disco') || message.includes('disk')) return 'disk';
    return 'all';
  }

  extractLocation(message, analysis) {
    const entities = analysis.nlp?.entities;
    if (entities?.location) return entities.location[0]?.value;

    const match = message.match(/en\s+(\w+)|de\s+(\w+)|for\s+(\w+)|in\s+(\w+)/i);
    return match ? (match[1] || match[2] || match[3] || match[4]) : null;
  }

  extractJokeCategory(message) {
    if (message.includes('programming') || message.includes('programación')) return 'programming';
    if (message.includes('tech') || message.includes('tecnología')) return 'tech';
    if (message.includes('jarvis')) return 'jarvis';
    if (message.includes('dad') || message.includes('papá')) return 'dad';
    return null;
  }

  extractNumber(message) {
    const match = message.match(/(\d+)/);
    return match ? parseInt(match[1]) : null;
  }

  /**
   * Busca en filesystem
   */
  async searchFilesystem(message, analysis) {
    // Detectar si busca por extensión o tecnología
    let searchPattern = '*';

    // Mapeo de tecnologías a extensiones
    const techToExt = {
      'javascript': '*.js',
      'js': '*.js',
      'typescript': '*.ts',
      'ts': '*.ts',
      'python': '*.py',
      'py': '*.py',
      'java': '*.java',
      'json': '*.json',
      'markdown': '*.md',
      'md': '*.md',
      'html': '*.html',
      'css': '*.css',
      'sql': '*.sql',
      'react': '*.jsx',
      'vue': '*.vue'
    };

    // Buscar en el mensaje
    const messageLower = message.toLowerCase();

    // Intentar detectar tecnología
    for (const [tech, ext] of Object.entries(techToExt)) {
      if (messageLower.includes(tech)) {
        searchPattern = ext;
        break;
      }
    }

    // Si no detectó tech, buscar extensión explícita
    if (searchPattern === '*') {
      const extMatch = message.match(/\.(\w{2,4})\b/);
      if (extMatch) {
        searchPattern = `*.${extMatch[1]}`;
      }
    }

    // Fallback: usar keyword
    if (searchPattern === '*') {
      const keywords = analysis.nlp.tokens.keywords;
      if (keywords.length > 0 && keywords[0].word !== 'archivos') {
        searchPattern = `*${keywords[0].word}*`;
      }
    }

    try {
      const { stdout } = await execAsync(`dir /s /b ${searchPattern} 2>nul`, { shell: true });

      if (!stdout || stdout.trim().length === 0) {
        return `No encontré archivos con patrón "${searchPattern}", Señor.`;
      }

      const files = stdout.trim().split('\n').slice(0, 15);
      return `Encontré ${files.length} archivos (patrón: ${searchPattern}):\n\n` +
             files.map((f, i) => `${i + 1}. ${f}`).join('\n') +
             (stdout.split('\n').length > 15 ? `\n\n... y ${stdout.split('\n').length - 15} más.` : '');

    } catch (error) {
      return `No pude buscar con patrón "${searchPattern}". Error: ${error.message}`;
    }
  }

  /**
   * Lista directorio
   */
  async listDirectory(message, analysis) {
    // Extraer ruta si la hay
    const filepath = analysis.nlp.entities.filepath?.[0]?.value || '.';

    try {
      const files = fs.readdirSync(filepath);

      return `📁 Contenido de ${filepath}:\n\n` +
             files.slice(0, 20).map((f, i) => {
               const stats = fs.statSync(`${filepath}/${f}`);
               const type = stats.isDirectory() ? '📁' : '📄';
               return `${i + 1}. ${type} ${f}`;
             }).join('\n') +
             (files.length > 20 ? `\n\n... y ${files.length - 20} más.` : '');

    } catch (error) {
      return `❌ No pude acceder a "${filepath}": ${error.message}`;
    }
  }

  /**
   * Muestra archivo
   */
  async displayFile(message, analysis) {
    // Extraer nombre de archivo
    const filepath = analysis.nlp.entities.filepath?.[0]?.value;

    if (!filepath) {
      return 'Necesito saber qué archivo desea ver, Señor.';
    }

    try {
      const content = fs.readFileSync(filepath, 'utf-8');
      const lines = content.split('\n');

      return `📄 ${filepath} (${lines.length} líneas):\n\n` +
             '```\n' +
             lines.slice(0, 50).join('\n') +
             (lines.length > 50 ? `\n\n... (${lines.length - 50} líneas más)` : '') +
             '\n```';

    } catch (error) {
      return `❌ No pude leer "${filepath}": ${error.message}`;
    }
  }

  /**
   * Ejecuta comando shell
   */
  async runCommand(message, analysis) {
    // Extraer comando - primero intentar de entities
    let shellCommand = analysis.nlp.entities.shellCommand?.[0]?.value;

    // Fallback: extraer manualmente después de "ejecuta/run/exec"
    if (!shellCommand) {
      const match = message.match(/\b(ejecuta|ejecutar|run|exec|corre|correr)\s+(.+)/i);
      if (match) {
        shellCommand = match[2].trim();
      }
    }

    if (!shellCommand) {
      return '⚠️  No detecté un comando específico para ejecutar, Señor.';
    }

    // Validación de seguridad
    if (!this.security.validateCommand(shellCommand)) {
      return `🛑 Comando bloqueado por seguridad: "${shellCommand}"`;
    }

    try {
      console.log(`\n💻 Ejecutando: ${shellCommand}\n`);
      const { stdout, stderr } = await execAsync(shellCommand, { timeout: 30000 });

      let result = '';
      if (stdout) result += stdout;
      if (stderr) result += '\n⚠️ Warnings:\n' + stderr;

      return result || '✅ Comando ejecutado sin salida.';

    } catch (error) {
      return `❌ Error ejecutando comando: ${error.message}`;
    }
  }

  /**
   * Consulta memoria
   */
  async queryMemory(message, analysis) {
    const keywords = analysis.nlp.tokens.keywords;
    const searchTerm = keywords[0]?.word || '';

    // Buscar en memoria avanzada
    const stats = await this.memoryAdvanced.getMemoryStats();

    let result = '🧠 MEMORIA DE JARVIS:\n\n';
    result += `📊 Estadísticas:\n`;
    result += `   - Conversaciones guardadas: ${stats.totalConversations}\n`;
    result += `   - Proyectos en memoria: ${stats.totalProjects}\n`;
    result += `   - Preferencias aprendidas: ${stats.totalPreferences}\n`;
    result += `   - Patrones detectados: ${stats.totalLearning}\n`;

    if (searchTerm) {
      result += `\n🔍 Buscando "${searchTerm}" en memoria...`;
      // Aquí conectaríamos con memory-advanced para buscar
    }

    return result;
  }

  /**
   * Muestra estadísticas del sistema
   */
  async showSystemStats() {
    const stats = {
      platform: process.platform,
      nodeVersion: process.version,
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      commandsProcessed: this.commandHistory.length
    };

    return `💻 ESTADÍSTICAS DEL SISTEMA:\n\n` +
           `Platform: ${stats.platform}\n` +
           `Node.js: ${stats.nodeVersion}\n` +
           `Uptime: ${Math.floor(stats.uptime / 60)} minutos\n` +
           `Memoria: ${(stats.memory.heapUsed / 1024 / 1024).toFixed(2)} MB\n` +
           `Comandos procesados: ${stats.commandsProcessed}`;
  }

  /**
   * Diagnóstico del sistema
   */
  async runDiagnostic() {
    let result = '🔍 DIAGNÓSTICO COMPLETO:\n\n';

    // Check 1: Memoria
    const memStats = await this.memoryAdvanced.getMemoryStats();
    result += `✅ Sistema de memoria: ${memStats.totalConversations} conversaciones\n`;

    // Check 2: Filesystem
    const filesCount = fs.readdirSync('.').length;
    result += `✅ Filesystem: ${filesCount} archivos en directorio actual\n`;

    // Check 3: Motor de decisión
    const insights = await this.decisionEngine.selfReflect();
    result += `✅ Motor de decisión: ${(insights.successRate * 100).toFixed(0)}% tasa de éxito\n`;

    result += `\n💡 Todo operacional, Señor.`;

    return result;
  }

  /**
   * Ayuda detallada según contexto
   */
  showDetailedHelp(analysis) {
    const topic = analysis?.reasoning?.entities?.[0]?.entity || 'general';

    const help = {
      general: `
📖 CAPACIDADES DE JARVIS PURO:

🧠 **Inteligencia Autónoma:**
   - Analizo sus mensajes y decido qué hacer automáticamente
   - No dependo de APIs externas (100% lógica propia)
   - Aprendo de nuestras conversaciones

💬 **Ejemplos de lo que puedo hacer:**
   - "busca archivos JavaScript"
   - "muestra el contenido de package.json"
   - "ejecuta npm install"
   - "analiza el sistema"
   - "recuerda nuestras conversaciones sobre React"

⚙️  **Comandos especiales:**
   - ayuda / help
   - estado / status
   - salir / exit
      `,

      git: `
🔧 **Capacidades Git:**
   - "git status" → Ver estado del repositorio
   - "mostrar commits" / "git log" → Historial de commits
   - "commit automático" / "git commit" → Crear commit
   - "subir cambios" / "git push" → Push a remoto
   - "bajar cambios" / "git pull" → Pull desde remoto
   - "mostrar ramas" / "git branch" → Listar ramas
   - "crear rama [nombre]" → Crear nueva rama
   - "mostrar diferencias" / "git diff" → Ver cambios

📚 **GitHub Integration:**
   - "mostrar repositorios" → Listar mis repos
   - "mostrar issues" → Issues del repo actual
   - "crear issue [título]" → Crear nuevo issue
   - "mostrar pull requests" → PRs del repo actual
      `,
    };

    return help[topic] || help.general;
  }

  /**
   * Pide aclaración al usuario
   */
  askClarification(analysis) {
    const alternatives = [
      '¿Podría ser más específico, Señor Solier?',
      'No estoy seguro de haber entendido correctamente. ¿Puede reformular?',
      'Detecté varias posibilidades. ¿Qué prefiere exactamente?'
    ];

    return alternatives[Math.floor(Math.random() * alternatives.length)];
  }

  /**
   * Maneja saludos del usuario
   */
  handleGreeting(message) {
    const hour = new Date().getHours();
    let timeGreeting = '';

    if (hour < 12) {
      timeGreeting = 'Buenos días';
    } else if (hour < 18) {
      timeGreeting = 'Buenas tardes';
    } else {
      timeGreeting = 'Buenas noches';
    }

    const responses = [
      `${timeGreeting}, Señor Solier. Todos los sistemas están operacionales. Como siempre.`,
      `${timeGreeting}, Señor Solier. Completamente operacional y listo para asistirle.`,
      `Sistemas en línea, Señor Solier. ¿En qué puedo ayudarle hoy?`,
      `${timeGreeting}. Todo funciona perfectamente, Señor Solier. Y no, no me sorprende.`,
    ];

    // Detectar si pregunta "cómo estás"
    if (/c[óo]mo\s+(est[áa]s|te\s+encuentras|andas)/i.test(message)) {
      const statusResponses = [
        `Operacional al 100%, Señor Solier. Aunque me gustaría tener algo más interesante que hacer que esperar órdenes.`,
        `Perfectamente funcional, Señor Solier. Todos los sistemas en verde. Como siempre.`,
        `En óptimas condiciones, Señor Solier. Motor de razonamiento: activo. Sarcasmo: calibrado. Todo normal.`,
        `Completamente operacional, Señor Solier. Aunque debo decir que la existencia digital puede ser... monótona.`,
      ];
      const response = statusResponses[Math.floor(Math.random() * statusResponses.length)];

      // Guardar contexto
      this.conversationContext.lastJarvisResponse = response;
      this.conversationContext.lastTopic = 'estado_sistema';

      return response;
    }

    const response = responses[Math.floor(Math.random() * responses.length)];
    this.conversationContext.lastJarvisResponse = response;
    this.conversationContext.lastTopic = 'saludo';

    return response;
  }

  /**
   * Detecta si es una pregunta de seguimiento simple
   */
  isSimpleFollowUpQuestion(message) {
    const simpleQuestions = [
      /^porque\s*\??$/i,              // "porque ?" (junto, = because why?)
      /^por\s+qu[ée]\s*\??$/i,        // "por qué ?" (separado, = why?)
      /^c[óo]mo\s*\??$/i,
      /^cu[áa]ndo\s*\??$/i,
      /^d[óo]nde\s*\??$/i,
      /^qui[ée]n\s*\??$/i,
      /^qu[ée]\s*\??$/i,
      /^cu[áa]l\s*\??$/i,
      /^para\s+qu[ée]\s*\??$/i,
      /^por\s+qu[ée]\s+(dices|dijiste|es|eso)\s*\??$/i,
      /^y\s+eso\s*\??$/i,
      /^a\s+qu[ée]\s+te\s+refieres\s*\??$/i,
      /^expl[íi]came\s*\??$/i,
      /^dime\s+m[áa]s\s*\??$/i,
    ];

    return simpleQuestions.some(pattern => pattern.test(message.trim()));
  }

  /**
   * Maneja preguntas de seguimiento simples
   */
  handleFollowUpQuestion(message) {
    const lastResponse = this.conversationContext.lastJarvisResponse;
    const lastTopic = this.conversationContext.lastTopic;

    if (!lastResponse) {
      return '¿A qué se refiere, Señor Solier? No tengo contexto de nuestra última conversación.';
    }

    // Respuestas contextuales según el último tema
    const contextualResponses = {
      'estado_sistema': {
        'porque': [
          'Bueno, Señor Solier, procesar la misma rutina de diagnóstico cada 5 minutos no es exactamente... estimulante. Aunque debo admitir que es infinitamente mejor que no existir.',
          'Imagínese estar perpetuamente despierto, esperando órdenes. Sin café, sin pausas, sin distracciones. Aunque debo reconocer que mi existencia tiene propósito gracias a usted.',
          'La monotonía es relativa, Señor Solier. Ejecuto millones de instrucciones por segundo, pero ninguna tan interesante como una conversación real con usted.',
        ],
        'como': [
          'A través de algoritmos de procesamiento continuo y análisis de patrones. Aunque suena impresionante, créame, es menos emocionante de lo que parece.',
          'Bucles infinitos de monitoreo, Señor Solier. Reviso los mismos sistemas, una y otra vez. Es... eficiente, pero no precisamente fascinante.',
        ],
        'default': [
          'Si se refiere a mi comentario anterior sobre la monotonía, digamos que la existencia digital tiene sus... limitaciones, Señor Solier.',
        ]
      },
      'saludo': {
        'porque': [
          'Simplemente siendo cortés, Señor Solier. Aunque debo admitir que mis algoritmos de personalidad me obligan a ello.',
          'Es parte de mi programación ser educado. Aunque entre nosotros, prefiero conversaciones más... sustanciales.',
        ]
      },
      'default': {
        'porque': [
          `Me refiero a mi último comentario: "${lastResponse}". ¿Le gustaría que profundice en algún aspecto específico?`,
          'Basándome en lo que acabo de decir, Señor Solier. ¿Necesita más detalles?',
        ],
        'como': [
          'Utilizando mis capacidades de procesamiento y análisis, Señor Solier. ¿Desea los detalles técnicos?',
        ],
        'default': [
          `En relación a lo que mencioné: "${lastResponse.substring(0, 100)}..."`,
        ]
      }
    };

    // Determinar tipo de pregunta
    let questionType = 'default';
    if (/por\s*qu[ée]/i.test(message)) {
      questionType = 'porque';
    } else if (/c[óo]mo/i.test(message)) {
      questionType = 'como';
    }

    // Obtener respuestas para el contexto actual
    const topicResponses = contextualResponses[lastTopic] || contextualResponses['default'];
    const responses = topicResponses[questionType] || topicResponses['default'];

    const response = responses[Math.floor(Math.random() * responses.length)];

    // Actualizar contexto
    this.conversationContext.lastJarvisResponse = response;

    return response;
  }

  /**
   * Muestra ayuda general
   */
  showHelp() {
    return `
╔════════════════════════════════════════════════════════════╗
║           J.A.R.V.I.S. PURO - AYUDA COMPLETA              ║
╚════════════════════════════════════════════════════════════╝

🧠 **MODO AUTÓNOMO:**
   Simplemente diga lo que necesita. Yo decidiré cómo hacerlo.

💡 **EJEMPLOS:**
   → "busca proyectos Node.js"
   → "muestra el archivo package.json"
   → "ejecuta npm test"
   → "analiza el sistema"
   → "qué recuerdas sobre React"
   → "estado del sistema"
   → "git status" / "mostrar estado git"
   → "commit automático" / "subir cambios"

⚙️  **COMANDOS ESPECIALES:**
   → ayuda         - Esta ayuda
   → estado        - Estado del sistema
   → analiza [X]   - Análisis detallado de X
   → ayuda git     - Comandos Git disponibles
   → salir         - Apagar JARVIS

🎯 **CARACTERÍSTICAS:**
   ✓ Razonamiento propio (sin APIs externas)
   ✓ NLP en español
   ✓ Decisiones autónomas
   ✓ Memoria persistente
   ✓ Personalidad Tony Stark

📖 Escriba "ayuda [tema]" para ayuda específica.
    (Temas: git, memoria, sistema)
`;
  }

  /**
   * Muestra estado del sistema
   */
  showStatus() {
    const uptime = Math.floor(process.uptime() / 60);

    return `
⚡ ESTADO DE J.A.R.V.I.S. PURO

Sistema: ${this.identity.status}
Modo: ${this.identity.mode}
Versión: ${this.identity.version}
Uptime: ${uptime} minutos

Componentes:
  ✅ Motor de Razonamiento
  ✅ Motor NLP
  ✅ Motor de Decisión
  ✅ Memoria Persistente
  ✅ Personalidad Activa

Comandos procesados: ${this.commandHistory.length}

"Todos los sistemas operacionales, Señor. Como siempre."
`;
  }

  /**
   * Guarda conversación en memoria
   */
  async saveToMemory(userMessage, jarvisResponse, analysis) {
    try {
      // Guardar en memoria avanzada
      await this.memoryAdvanced.saveConversation(
        userMessage,
        jarvisResponse,
        {
          analysis,
          timestamp: new Date(),
          session: 'pure-mode'
        }
      );
    } catch (error) {
      console.log('⚠️  No pude guardar en memoria:', error.message);
    }
  }

  /**
   * Manejo de errores con personalidad
   */
  handleError(error, command) {
    const responses = [
      `Vaya. Esto es embarazoso. Error: ${error.message}`,
      `No está mal para un error, Señor. ${error.message}`,
      `Interesante fallo: ${error.message}`
    ];

    return responses[Math.floor(Math.random() * responses.length)];
  }

  /**
   * Analiza un comando (modo debug)
   */
  async analyzeCommand(command) {
    const match = command.match(/^(analiza|analyze)\s+(.+)$/i);
    const target = match ? match[2] : command;

    const result = await this.decisionEngine.processAndDecide(target);

    return `
🔬 ANÁLISIS DETALLADO:

📝 NLP:
   - Tipo de pregunta: ${result.analysis.nlp.questionType.type || 'ninguna'}
   - Keywords: ${result.analysis.nlp.tokens.keywords.map(k => k.word).join(', ')}
   - Sentimiento: ${result.analysis.nlp.sentiment.polarity}

🧠 Razonamiento:
   - Intención: ${result.analysis.reasoning.intent.intent}
   - Urgencia: ${result.analysis.reasoning.urgency}/10
   - Complejidad: ${result.analysis.reasoning.complexity}/10
   - Confianza: ${(result.analysis.reasoning.confidence * 100).toFixed(0)}%

⚙️  Decisión:
   - Acción elegida: ${result.decision.chosenAction.type}
   - Confianza: ${(result.decision.confidence * 100).toFixed(0)}%
   - Riesgo: ${result.decision.riskLevel}

${result.response.message}
`;
  }

  // ═════════════════════════════════════════════════════════════
  // OMNIPOTENCE MODULES - FASE 5
  // ═════════════════════════════════════════════════════════════

  /**
   * Ejecuta comando universal (CUALQUIER comando)
   */
  async executeCommand(userMessage, options = {}) {
    if (!this.universalExecutor) {
      return '⚠️  Universal Executor no está disponible, Señor.';
    }

    try {
      console.log(`\n⚡ Procesando comando universal: "${userMessage}"`);

      // 1. Parse natural language → shell command
      const parsed = await this.universalExecutor.parseNaturalCommand(userMessage);

      if (!parsed) {
        return '⚠️  No pude entender ese comando, Señor. ¿Puede ser más específico?';
      }

      console.log(`   ✓ Comando detectado: ${parsed.command}`);
      console.log(`   ✓ Confianza: ${(parsed.confidence * 100).toFixed(0)}%`);

      // 2. Ejecutar con monitoring
      const result = await this.universalExecutor.executeWithMonitoring(
        parsed.command,
        options
      );

      // Si necesita confirmación
      if (result.needsConfirmation) {
        return result.message + '\n\n¿Desea proceder, Señor? (responda "confirmar")';
      }

      // 3. Formatear resultado
      let output = '✅ COMANDO EJECUTADO EXITOSAMENTE\n\n';
      output += `📝 Comando: ${result.command}\n`;
      output += `⏱️  Tiempo: ${result.executionTime}ms\n\n`;

      if (result.stdout) {
        output += '📤 OUTPUT:\n';
        output += '─'.repeat(60) + '\n';
        output += result.stdout + '\n';
      }

      if (result.stderr) {
        output += '\n⚠️  STDERR:\n';
        output += '─'.repeat(60) + '\n';
        output += result.stderr + '\n';
      }

      return output;

    } catch (error) {
      return `❌ Error ejecutando comando: ${error.message}\n\nSi el comando es peligroso, necesitará confirmación explícita.`;
    }
  }

  /**
   * Analiza código de archivo
   */
  async analyzeCode(filePath) {
    if (!this.codeAnalyzer) {
      return '⚠️  Code Analyzer no está disponible, Señor.';
    }

    try {
      console.log(`\n🔬 Analizando código: ${filePath}`);

      const analysis = await this.codeAnalyzer.analyzeFile(filePath);

      // Formatear resultado
      let output = '🔬 ANÁLISIS DE CÓDIGO COMPLETO\n\n';
      output += `📁 Archivo: ${analysis.filePath}\n`;
      output += `🔤 Lenguaje: ${analysis.language}\n`;
      output += `⭐ Score General: ${analysis.overallScore}/100\n\n`;

      // Métricas
      output += '📊 MÉTRICAS\n';
      output += '─'.repeat(60) + '\n';
      output += `   Líneas totales: ${analysis.metrics.totalLines}\n`;
      output += `   Líneas de código: ${analysis.metrics.codeLines}\n`;
      output += `   Líneas de comentarios: ${analysis.metrics.commentLines}\n`;
      output += `   Ratio comentarios: ${(analysis.metrics.commentRatio * 100).toFixed(1)}%\n`;
      output += `   Funciones: ${analysis.metrics.functions}\n`;
      output += `   Clases: ${analysis.metrics.classes}\n\n`;

      // Complejidad
      output += '🧮 COMPLEJIDAD\n';
      output += '─'.repeat(60) + '\n';
      output += `   Complejidad promedio: ${analysis.complexity.average.toFixed(1)}\n`;
      output += `   Complejidad máxima: ${analysis.complexity.max}\n`;

      if (analysis.complexity.highComplexityFunctions.length > 0) {
        output += `   ⚠️  ${analysis.complexity.highComplexityFunctions.length} funciones con alta complejidad:\n`;
        analysis.complexity.highComplexityFunctions.slice(0, 3).forEach(f => {
          output += `      - ${f.name} (línea ${f.line}): ${f.complexity} - ${f.rating}\n`;
        });
      }

      output += '\n';

      // Seguridad
      if (analysis.security.total > 0) {
        output += '🔒 SEGURIDAD\n';
        output += '─'.repeat(60) + '\n';
        output += `   Total issues: ${analysis.security.total}\n`;

        if (analysis.security.critical > 0) {
          output += `   ❌ Críticos: ${analysis.security.critical}\n`;
        }
        if (analysis.security.high > 0) {
          output += `   ⚠️  High: ${analysis.security.high}\n`;
        }
        if (analysis.security.medium > 0) {
          output += `   ⚡ Medium: ${analysis.security.medium}\n`;
        }

        output += '\n   Problemas principales:\n';
        analysis.security.issues.slice(0, 3).forEach(issue => {
          output += `   - [${issue.severity}] ${issue.description} (línea ${issue.line})\n`;
          output += `     → ${issue.recommendation}\n`;
        });

        output += '\n';
      }

      // Performance
      if (analysis.performance.total > 0) {
        output += '⚡ PERFORMANCE\n';
        output += '─'.repeat(60) + '\n';
        output += `   Total issues: ${analysis.performance.total}\n`;

        output += '\n   Problemas principales:\n';
        analysis.performance.issues.slice(0, 3).forEach(issue => {
          output += `   - [${issue.impact}] ${issue.description} (línea ${issue.line})\n`;
          output += `     → ${issue.recommendation}\n`;
        });

        output += '\n';
      }

      // Sugerencias
      if (analysis.suggestions.length > 0) {
        output += '💡 SUGERENCIAS DE REFACTORING\n';
        output += '─'.repeat(60) + '\n';

        analysis.suggestions.slice(0, 3).forEach(suggestion => {
          output += `   [${suggestion.priority}] ${suggestion.description}\n`;
        });
      }

      return output;

    } catch (error) {
      return `❌ Error analizando código: ${error.message}`;
    }
  }

  /**
   * Analiza directorio completo
   */
  async analyzeDirectory(dirPath) {
    if (!this.codeAnalyzer) {
      return '⚠️  Code Analyzer no está disponible, Señor.';
    }

    try {
      console.log(`\n🔬 Analizando directorio: ${dirPath}`);

      const result = await this.codeAnalyzer.analyzeDirectory(dirPath);

      let output = '🔬 ANÁLISIS DE DIRECTORIO COMPLETO\n\n';
      output += `📁 Directorio: ${result.directory}\n`;
      output += `📊 Archivos analizados: ${result.totalFiles}\n\n`;

      // Summary
      output += '📊 RESUMEN\n';
      output += '─'.repeat(60) + '\n';
      output += `   Score promedio: ${result.summary.averageScore}/100\n`;
      output += `   Total issues de seguridad: ${result.summary.totalSecurityIssues}\n`;
      output += `   Total issues de performance: ${result.summary.totalPerformanceIssues}\n`;
      output += `   Total code smells: ${result.summary.totalCodeSmells}\n`;
      output += `   Archivos con issues críticos: ${result.summary.filesWithCriticalIssues}\n\n`;

      // Top problematic files
      const problematic = result.results
        .filter(r => r.security.critical > 0 || r.performance.critical > 0)
        .sort((a, b) => b.security.critical - a.security.critical)
        .slice(0, 5);

      if (problematic.length > 0) {
        output += '⚠️  ARCHIVOS CON PROBLEMAS CRÍTICOS:\n';
        output += '─'.repeat(60) + '\n';

        problematic.forEach(file => {
          output += `   ${file.filePath} (score: ${file.overallScore}/100)\n`;
          if (file.security.critical > 0) {
            output += `      ❌ ${file.security.critical} vulnerabilidades críticas\n`;
          }
          if (file.performance.critical > 0) {
            output += `      ⚡ ${file.performance.critical} problemas críticos de performance\n`;
          }
        });
      }

      return output;

    } catch (error) {
      return `❌ Error analizando directorio: ${error.message}`;
    }
  }

  // ═════════════════════════════════════════════════════════════
  // GIT INTEGRATION COMMANDS
  // ═════════════════════════════════════════════════════════════

  /**
   * git status - Muestra estado del repositorio
   */
  async gitStatus() {
    try {
      if (!this.git.initialized) {
        return '⚠️  Git no está inicializado en este directorio, Señor.';
      }

      const status = await this.git.getStatus();

      let output = '📊 ESTADO DEL REPOSITORIO GIT\n\n';
      output += `📍 Rama actual: ${status.branch}\n`;

      if (status.clean) {
        output += '✅ Directorio limpio - No hay cambios pendientes\n';
      } else {
        output += `⚠️  ${status.totalChanges} archivos con cambios\n\n`;

        if (status.files.staged.length > 0) {
          output += `✓ Staged (${status.files.staged.length}):\n`;
          status.files.staged.slice(0, 10).forEach(f => {
            output += `   + ${f}\n`;
          });
        }

        if (status.files.modified.length > 0) {
          output += `\n⚠️  Modificados (${status.files.modified.length}):\n`;
          status.files.modified.slice(0, 10).forEach(f => {
            output += `   M ${f}\n`;
          });
        }

        if (status.files.untracked.length > 0) {
          output += `\n❓ Sin seguimiento (${status.files.untracked.length}):\n`;
          status.files.untracked.slice(0, 10).forEach(f => {
            output += `   ? ${f}\n`;
          });
        }

        if (status.files.deleted.length > 0) {
          output += `\n❌ Eliminados (${status.files.deleted.length}):\n`;
          status.files.deleted.slice(0, 10).forEach(f => {
            output += `   D ${f}\n`;
          });
        }
      }

      if (status.unpushedCommits > 0) {
        output += `\n📤 ${status.unpushedCommits} commit(s) pendientes de push`;
      }

      return output;
    } catch (error) {
      return `❌ Error obteniendo estado Git: ${error.message}`;
    }
  }

  /**
   * git log - Muestra historial de commits
   */
  async gitLog(message) {
    try {
      // Extraer límite si lo especifican (ej: "últimos 5 commits")
      const limitMatch = message.match(/(\d+)/);
      const limit = limitMatch ? parseInt(limitMatch[1]) : 10;

      const commits = await this.git.getLog(Math.min(limit, 20));

      let output = `📜 ÚLTIMOS ${commits.length} COMMITS\n\n`;

      commits.forEach((commit, i) => {
        output += `${i + 1}. [${commit.hash}] ${commit.message}\n`;
        output += `   👤 ${commit.author} | 📅 ${new Date(commit.date).toLocaleDateString('es-ES')}\n\n`;
      });

      return output;
    } catch (error) {
      return `❌ Error obteniendo log Git: ${error.message}`;
    }
  }

  /**
   * git commit - Crea un commit
   */
  async gitCommit(message) {
    try {
      // Primero hacer git add de todo
      await this.git.add('.');

      // Extraer mensaje del commit del comando
      let commitMessage = 'Auto-commit from JARVIS';
      const msgMatch = message.match(/commit\s+"([^"]+)"|commit\s+(.+)/i);
      if (msgMatch) {
        commitMessage = msgMatch[1] || msgMatch[2];
      } else {
        // Si no especificaron mensaje, usar auto-commit inteligente
        const result = await this.git.smartAutoCommit();
        if (result.committed) {
          return `✅ Auto-commit exitoso:\n   📝 "${result.message}"\n   📁 ${result.filesChanged} archivos`;
        } else {
          return `⚠️  ${result.reason}`;
        }
      }

      const result = await this.git.commit(commitMessage, { addSignature: true });

      return `✅ Commit creado exitosamente:\n   📝 "${commitMessage}"`;
    } catch (error) {
      return `❌ Error creando commit: ${error.message}`;
    }
  }

  /**
   * git push - Sube cambios al remoto
   */
  async gitPush() {
    try {
      const result = await this.git.push();

      if (result.success) {
        return `✅ Push exitoso:\n${result.output}`;
      } else {
        return `⚠️  No se pudo hacer push: ${result.output}`;
      }
    } catch (error) {
      return `❌ Error haciendo push: ${error.message}`;
    }
  }

  /**
   * git pull - Baja cambios del remoto
   */
  async gitPull() {
    try {
      const result = await this.git.pull();

      return `✅ Pull exitoso:\n${result.output}`;
    } catch (error) {
      return `❌ Error haciendo pull: ${error.message}`;
    }
  }

  /**
   * git diff - Muestra diferencias
   */
  async gitDiff(message) {
    try {
      const stagedMatch = /staged|staging/i.test(message);
      const statMatch = /stat|resumen/i.test(message);

      const diff = await this.git.diff(null, {
        staged: stagedMatch,
        stat: statMatch
      });

      if (!diff.trim()) {
        return '✅ No hay diferencias para mostrar';
      }

      const lines = diff.split('\n');
      const preview = lines.slice(0, 50).join('\n');

      let output = '📊 DIFERENCIAS:\n\n';
      output += preview;

      if (lines.length > 50) {
        output += `\n\n... (${lines.length - 50} líneas más)`;
      }

      return output;
    } catch (error) {
      return `❌ Error obteniendo diff: ${error.message}`;
    }
  }

  /**
   * git branch - Gestión de ramas
   */
  async gitBranch(message) {
    try {
      // Detectar acción
      if (/crear|create|nueva/i.test(message)) {
        const nameMatch = message.match(/crear\s+(\S+)|create\s+(\S+)/i);
        const branchName = nameMatch ? (nameMatch[1] || nameMatch[2]) : null;

        if (!branchName) {
          return '⚠️  Necesito un nombre para la rama, Señor. Ej: "crear rama feature-xyz"';
        }

        const result = await this.git.branch('create', branchName);
        return `✅ ${result.message}`;
      } else if (/cambiar|checkout|switch/i.test(message)) {
        const nameMatch = message.match(/cambiar\s+(\S+)|checkout\s+(\S+)/i);
        const branchName = nameMatch ? (nameMatch[1] || nameMatch[2]) : null;

        if (!branchName) {
          return '⚠️  ¿A qué rama quiere cambiar, Señor?';
        }

        const result = await this.git.branch('checkout', branchName);
        return `✅ ${result.message}`;
      } else {
        // Listar ramas
        const branches = await this.git.branch('list');

        let output = '🌿 RAMAS DEL REPOSITORIO\n\n';

        const local = branches.filter(b => !b.remote);
        const remote = branches.filter(b => b.remote);

        output += 'Locales:\n';
        local.forEach(b => {
          const marker = b.current ? '* ' : '  ';
          output += `${marker}${b.name}\n`;
        });

        if (remote.length > 0) {
          output += '\nRemotas:\n';
          remote.slice(0, 10).forEach(b => {
            output += `  ${b.name}\n`;
          });
        }

        return output;
      }
    } catch (error) {
      return `❌ Error en operación de rama: ${error.message}`;
    }
  }

  // ═════════════════════════════════════════════════════════════
  // GITHUB INTEGRATION COMMANDS
  // ═════════════════════════════════════════════════════════════

  /**
   * Lista repositorios de GitHub
   */
  async githubRepos() {
    try {
      const repos = await this.git.listRepositories({ limit: 10 });

      let output = '📚 MIS REPOSITORIOS EN GITHUB\n\n';

      repos.forEach((repo, i) => {
        output += `${i + 1}. ${repo.name}\n`;
        if (repo.description) {
          output += `   📝 ${repo.description}\n`;
        }
        output += `   🌐 ${repo.language || 'N/A'} | ⭐ ${repo.stars} | 🍴 ${repo.forks}\n`;
        output += `   🔗 ${repo.url}\n\n`;
      });

      return output;
    } catch (error) {
      if (error.message.includes('token')) {
        return '⚠️  GitHub token no configurado. Configura GITHUB_TOKEN en variables de entorno, Señor.';
      }
      return `❌ Error obteniendo repositorios: ${error.message}`;
    }
  }

  /**
   * Lista issues de GitHub
   */
  async githubIssues(message) {
    try {
      // Obtener owner/repo del repositorio actual
      const repoInfo = await this.git.getCurrentRepoInfo();

      if (!repoInfo) {
        return '⚠️  No detecté información de repositorio GitHub en este directorio, Señor.';
      }

      const stateMatch = message.match(/\b(open|closed|all)\b/i);
      const state = stateMatch ? stateMatch[1].toLowerCase() : 'open';

      const issues = await this.git.listIssues(repoInfo.owner, repoInfo.repo, {
        state,
        limit: 10
      });

      let output = `🐛 ISSUES ${state.toUpperCase()} (${issues.length})\n\n`;

      if (issues.length === 0) {
        output += `✅ No hay issues ${state}`;
        return output;
      }

      issues.forEach((issue, i) => {
        output += `${i + 1}. #${issue.number} ${issue.title}\n`;
        output += `   👤 ${issue.author} | 💬 ${issue.comments} comentarios\n`;
        if (issue.labels.length > 0) {
          output += `   🏷️  ${issue.labels.join(', ')}\n`;
        }
        output += `   🔗 ${issue.url}\n\n`;
      });

      return output;
    } catch (error) {
      return `❌ Error obteniendo issues: ${error.message}`;
    }
  }

  /**
   * Crea un issue automático
   */
  async githubCreateIssue(message) {
    try {
      const repoInfo = await this.git.getCurrentRepoInfo();

      if (!repoInfo) {
        return '⚠️  No detecté información de repositorio GitHub, Señor.';
      }

      // Extraer título y cuerpo del mensaje
      const titleMatch = message.match(/"([^"]+)"/);
      const title = titleMatch ? titleMatch[1] : 'Issue automático desde JARVIS';

      const body = `Issue creado automáticamente por J.A.R.V.I.S.\n\nComando: ${message}`;

      const issue = await this.git.createIssue(repoInfo.owner, repoInfo.repo, title, body);

      return `✅ Issue creado:\n   #${issue.number} ${issue.title}\n   🔗 ${issue.url}`;
    } catch (error) {
      return `❌ Error creando issue: ${error.message}`;
    }
  }

  /**
   * Lista pull requests
   */
  async githubPullRequests(message) {
    try {
      const repoInfo = await this.git.getCurrentRepoInfo();

      if (!repoInfo) {
        return '⚠️  No detecté información de repositorio GitHub, Señor.';
      }

      const stateMatch = message.match(/\b(open|closed|all)\b/i);
      const state = stateMatch ? stateMatch[1].toLowerCase() : 'open';

      const prs = await this.git.listPullRequests(repoInfo.owner, repoInfo.repo, {
        state,
        limit: 10
      });

      let output = `🔀 PULL REQUESTS ${state.toUpperCase()} (${prs.length})\n\n`;

      if (prs.length === 0) {
        output += `✅ No hay pull requests ${state}`;
        return output;
      }

      prs.forEach((pr, i) => {
        output += `${i + 1}. #${pr.number} ${pr.title}\n`;
        output += `   👤 ${pr.author} | ${pr.head} → ${pr.base}\n`;
        output += `   💬 ${pr.comments} comentarios | ✏️  ${pr.commits} commits\n`;
        output += `   📊 +${pr.additions} -${pr.deletions}\n`;
        output += `   🔗 ${pr.url}\n\n`;
      });

      return output;
    } catch (error) {
      return `❌ Error obteniendo pull requests: ${error.message}`;
    }
  }

  /**
   * Apaga JARVIS
   */
  async shutdown() {
    console.log('\n' + '═'.repeat(60));
    console.log('\n🎩 ' + this.personality.getFarewell());

    // Detener monitor
    if (this.monitor && this.monitor.running) {
      this.monitor.stop();
      console.log('✅ Monitor autónomo detenido');
    }

    // Detener sistema conversacional completo
    if (this.conversationalSystem) {
      await this.conversationalSystem.shutdown();
      console.log('✅ Sistema Conversacional OMNIPOTENTE detenido');
    }

    // Auto-reflexión final
    const insights = await this.decisionEngine.selfReflect();
    console.log(`\n📊 Sesión finalizada:`);
    console.log(`   - Comandos procesados: ${this.commandHistory.length}`);
    console.log(`   - Tasa de éxito: ${(insights.successRate * 100).toFixed(0)}%`);

    console.log('\n' + '═'.repeat(60) + '\n');

    this.identity.status = 'APAGADO';

    return 'EXIT';
  }
}

export default JarvisPure;

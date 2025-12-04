// core/proactive/ai-analyzer.cjs
// Sistema de análisis inteligente con IA para detectar problemas y sugerir mejoras

const fs = require('fs');
const axios = require('axios');
const { EventEmitter } = require('events');

class AICodeAnalyzer extends EventEmitter {
  constructor(options = {}) {
    super();

    this.ollamaUrl = options.ollamaUrl || 'http://localhost:11434';
    this.model = options.model || 'qwen2.5-coder:32b';
    this.fallbackModel = 'mistral:latest';
    this.maxContextLines = options.maxContextLines || 100;

    // Queue de análisis
    this.analysisQueue = [];
    this.isProcessing = false;
    this.maxConcurrent = 1; // Procesar uno a la vez para no saturar

    // Cache de análisis recientes
    this.analysisCache = new Map();
    this.cacheTimeout = 5 * 60 * 1000; // 5 minutos

    // Métricas
    this.stats = {
      totalAnalysis: 0,
      bugsDetected: 0,
      suggestionsGiven: 0,
      securityIssues: 0,
      performanceIssues: 0
    };
  }

  /**
   * Analiza un archivo y detecta problemas/mejoras
   */
  async analyzeFile(fileData) {
    const { path: filePath, fullPath, info, changeType, priority } = fileData;

    // Verificar cache
    const cacheKey = `${filePath}-${info.size}-${info.lines}`;
    if (this.analysisCache.has(cacheKey)) {
      const cached = this.analysisCache.get(cacheKey);
      if (Date.now() - cached.timestamp < this.cacheTimeout) {
        console.log(`💾 [AI Analyzer] Usando análisis cacheado: ${filePath}`);
        return cached.result;
      }
    }

    console.log(`🤖 [AI Analyzer] Analizando: ${filePath} (${priority} priority)`);

    try {
      const content = fs.readFileSync(fullPath, 'utf-8');
      const analysis = await this.performAnalysis(filePath, content, info, changeType);

      // Cachear resultado
      this.analysisCache.set(cacheKey, {
        result: analysis,
        timestamp: Date.now()
      });

      // Actualizar stats
      this.updateStats(analysis);

      // Emitir resultado
      this.emit('analysis:complete', {
        path: filePath,
        analysis,
        priority,
        timestamp: Date.now()
      });

      return analysis;
    } catch (error) {
      console.error(`❌ [AI Analyzer] Error analizando ${filePath}:`, error.message);

      this.emit('analysis:error', {
        path: filePath,
        error: error.message,
        timestamp: Date.now()
      });

      return null;
    }
  }

  /**
   * Realiza el análisis con IA
   */
  async performAnalysis(filePath, content, fileInfo, changeType) {
    // Limitar contenido si es muy largo
    const truncatedContent = this.truncateContent(content);

    const prompt = this.buildAnalysisPrompt(filePath, truncatedContent, fileInfo, changeType);

    try {
      // Intentar con modelo principal
      const response = await this.callOllama(this.model, prompt);
      return this.parseAnalysisResponse(response, filePath);
    } catch (error) {
      console.log(`⚠️ [AI Analyzer] Modelo principal falló, usando fallback...`);

      try {
        // Fallback a modelo más liviano
        const response = await this.callOllama(this.fallbackModel, prompt);
        return this.parseAnalysisResponse(response, filePath);
      } catch (fallbackError) {
        throw new Error(`Ambos modelos fallaron: ${error.message}`);
      }
    }
  }

  /**
   * Construye el prompt para el análisis
   */
  buildAnalysisPrompt(filePath, content, fileInfo, changeType) {
    const ext = fileInfo.extension;
    const type = fileInfo.type;

    return `Eres un asistente de código experto. Analiza el siguiente archivo y detecta:

1. **Bugs potenciales** (errores de lógica, typos, problemas de sintaxis)
2. **Problemas de seguridad** (injection, XSS, secrets expuestos)
3. **Issues de performance** (loops ineficientes, memory leaks)
4. **Mejoras de código** (refactoring, best practices)
5. **Tests faltantes** (funciones sin tests)

**Archivo:** ${filePath}
**Tipo:** ${type}
**Complejidad:** ${fileInfo.complexity}
**Cambio:** ${changeType}

\`\`\`${ext.replace('.', '')}
${content}
\`\`\`

Responde SOLO en formato JSON así:

{
  "bugs": [{"severity": "high|medium|low", "line": number, "description": "...", "suggestion": "..."}],
  "security": [{"severity": "critical|high|medium|low", "line": number, "issue": "...", "fix": "..."}],
  "performance": [{"impact": "high|medium|low", "line": number, "problem": "...", "solution": "..."}],
  "improvements": [{"type": "refactor|style|naming", "line": number, "current": "...", "suggested": "..."}],
  "tests": [{"function": "...", "reason": "...", "testCase": "..."}],
  "summary": "Un resumen de 1-2 líneas del análisis"
}

Si no encuentras problemas en alguna categoría, usa array vacío [].`;
  }

  /**
   * Llama a Ollama API
   */
  async callOllama(model, prompt) {
    const response = await axios.post(`${this.ollamaUrl}/api/generate`, {
      model,
      prompt,
      stream: false,
      options: {
        temperature: 0.3,
        top_p: 0.9,
        num_predict: 1000
      }
    }, {
      timeout: 30000 // 30 segundos
    });

    return response.data.response;
  }

  /**
   * Parsea la respuesta de IA
   */
  parseAnalysisResponse(response, filePath) {
    try {
      // Extraer JSON de la respuesta (puede venir con texto adicional)
      const jsonMatch = response.match(/\{[\s\S]*\}/);

      if (!jsonMatch) {
        throw new Error('No se encontró JSON válido en la respuesta');
      }

      const analysis = JSON.parse(jsonMatch[0]);

      // Validar estructura
      return {
        bugs: Array.isArray(analysis.bugs) ? analysis.bugs : [],
        security: Array.isArray(analysis.security) ? analysis.security : [],
        performance: Array.isArray(analysis.performance) ? analysis.performance : [],
        improvements: Array.isArray(analysis.improvements) ? analysis.improvements : [],
        tests: Array.isArray(analysis.tests) ? analysis.tests : [],
        summary: analysis.summary || 'Análisis completado'
      };
    } catch (error) {
      console.error(`⚠️ [AI Analyzer] Error parseando respuesta para ${filePath}:`, error.message);

      // Análisis básico como fallback
      return {
        bugs: [],
        security: [],
        performance: [],
        improvements: [],
        tests: [],
        summary: 'Error al parsear análisis detallado, se requiere revisión manual'
      };
    }
  }

  /**
   * Trunca contenido si es muy largo
   */
  truncateContent(content) {
    const lines = content.split('\n');

    if (lines.length <= this.maxContextLines) {
      return content;
    }

    // Tomar primeras y últimas líneas
    const half = Math.floor(this.maxContextLines / 2);
    const firstPart = lines.slice(0, half).join('\n');
    const lastPart = lines.slice(-half).join('\n');

    return `${firstPart}\n\n// ... [${lines.length - this.maxContextLines} líneas omitidas] ...\n\n${lastPart}`;
  }

  /**
   * Actualiza estadísticas
   */
  updateStats(analysis) {
    if (!analysis) return;

    this.stats.totalAnalysis++;
    this.stats.bugsDetected += analysis.bugs.length;
    this.stats.suggestionsGiven += analysis.improvements.length;
    this.stats.securityIssues += analysis.security.length;
    this.stats.performanceIssues += analysis.performance.length;
  }

  /**
   * Añade análisis a la queue
   */
  queueAnalysis(fileData) {
    this.analysisQueue.push(fileData);

    console.log(`📋 [AI Analyzer] Análisis en cola: ${fileData.path} (${this.analysisQueue.length} pendientes)`);

    if (!this.isProcessing) {
      this.processQueue();
    }
  }

  /**
   * Procesa la queue de análisis
   */
  async processQueue() {
    if (this.analysisQueue.length === 0) {
      this.isProcessing = false;
      return;
    }

    this.isProcessing = true;

    while (this.analysisQueue.length > 0) {
      const fileData = this.analysisQueue.shift();
      await this.analyzeFile(fileData);

      // Small delay entre análisis para no saturar
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    this.isProcessing = false;
  }

  /**
   * Obtiene estadísticas
   */
  getStats() {
    return {
      ...this.stats,
      queueSize: this.analysisQueue.length,
      cacheSize: this.analysisCache.size,
      isProcessing: this.isProcessing
    };
  }

  /**
   * Limpia cache antiguo
   */
  cleanCache() {
    const now = Date.now();
    let removed = 0;

    for (const [key, value] of this.analysisCache.entries()) {
      if (now - value.timestamp > this.cacheTimeout) {
        this.analysisCache.delete(key);
        removed++;
      }
    }

    if (removed > 0) {
      console.log(`🧹 [AI Analyzer] Cache limpiado: ${removed} entradas removidas`);
    }
  }
}

module.exports = AICodeAnalyzer;

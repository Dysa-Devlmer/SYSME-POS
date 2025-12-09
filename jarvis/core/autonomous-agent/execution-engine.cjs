// core/autonomous-agent/execution-engine.cjs
// Execution Engine - JARVIS ejecuta sub-tareas autónomamente

const axios = require('axios');
const fs = require('fs').promises;
const path = require('path');
const { EventEmitter } = require('events');
const { exec } = require('child_process');
const { promisify } = require('util');
const execPromise = promisify(exec);

/**
 * Execution Engine
 *
 * Capacidades:
 * - Ejecuta sub-tareas según su tipo (research, code, test, document)
 * - Integra con Web Intelligence para research
 * - Genera código con Ollama
 * - Ejecuta tests
 * - Crea documentación
 * - Reporta progreso en tiempo real
 * - Maneja errores y retry
 */
class ExecutionEngine extends EventEmitter {
  constructor(options = {}) {
    super();

    this.projectRoot = options.projectRoot || process.cwd();
    this.ollamaUrl = options.ollamaUrl || 'http://localhost:11434';
    this.model = options.model || 'qwen2.5-coder:latest';
    this.timeout = options.timeout || 120000;

    // Web Intelligence para research (se inyecta desde afuera)
    this.webIntelligence = options.webIntelligence || null;

    // Memory Manager para guardar aprendizajes
    this.memoryManager = options.memoryManager || null;

    // Configuración
    this.maxRetries = options.maxRetries || 3;
    this.retryDelay = options.retryDelay || 5000;

    // Estado de ejecución
    this.currentSubtask = null;
    this.executionResults = [];
  }

  /**
   * Ejecuta una sub-tarea
   */
  async executeSubtask(subtask, context = {}) {
    console.log(`\n🚀 [Execution Engine] Ejecutando: "${subtask.title}"`);
    this.emit('subtask:start', { subtask });

    this.currentSubtask = subtask;
    let attempt = 0;
    let lastError = null;

    // Retry loop
    while (attempt < this.maxRetries) {
      try {
        attempt++;
        console.log(`   Intento ${attempt}/${this.maxRetries}`);

        // Ejecutar según tipo
        let result;
        switch (subtask.type) {
          case 'research':
            result = await this.executeResearch(subtask, context);
            break;
          case 'code':
            result = await this.executeCode(subtask, context);
            break;
          case 'test':
            result = await this.executeTest(subtask, context);
            break;
          case 'document':
            result = await this.executeDocument(subtask, context);
            break;
          case 'deploy':
            result = await this.executeDeploy(subtask, context);
            break;
          default:
            result = await this.executeGeneric(subtask, context);
        }

        // Éxito!
        console.log(`✅ [Execution Engine] Completada: "${subtask.title}"`);
        this.emit('subtask:complete', { subtask, result });

        this.executionResults.push({
          subtask: subtask.id,
          success: true,
          result,
          attempts: attempt,
          timestamp: Date.now()
        });

        this.currentSubtask = null;
        return result;

      } catch (error) {
        lastError = error;
        console.error(`❌ [Execution Engine] Error en intento ${attempt}: ${error.message}`);

        if (attempt < this.maxRetries) {
          console.log(`   Reintentando en ${this.retryDelay / 1000}s...`);
          await this.sleep(this.retryDelay);
        }
      }
    }

    // Falló después de todos los intentos
    console.error(`💥 [Execution Engine] Falló después de ${this.maxRetries} intentos: "${subtask.title}"`);
    this.emit('subtask:failed', { subtask, error: lastError.message, attempts: this.maxRetries });

    this.executionResults.push({
      subtask: subtask.id,
      success: false,
      error: lastError.message,
      attempts: this.maxRetries,
      timestamp: Date.now()
    });

    this.currentSubtask = null;
    throw lastError;
  }

  /**
   * Ejecuta sub-tarea de tipo RESEARCH
   * Usa Web Intelligence para buscar información
   */
  async executeResearch(subtask, context) {
    console.log('📚 [Execution Engine] Tipo: Research');

    if (!this.webIntelligence) {
      throw new Error('Web Intelligence no está disponible');
    }

    // Extraer queries de la descripción
    const queries = this.extractResearchQueries(subtask);

    const learningResults = [];

    // Aprender sobre cada query
    for (const query of queries) {
      console.log(`   Investigando: "${query}"`);
      const result = await this.webIntelligence.learnAbout(query);

      if (result.success) {
        learningResults.push({
          query,
          knowledgeCount: result.knowledgeCount,
          summary: result.summary
        });
      }
    }

    // Consolidar conocimiento adquirido
    const consolidatedKnowledge = {
      queries,
      totalKnowledge: learningResults.reduce((sum, r) => sum + r.knowledgeCount, 0),
      results: learningResults
    };

    // Guardar en memoria
    if (this.memoryManager) {
      await this.memoryManager.store({
        type: 'research-task',
        content: consolidatedKnowledge,
        metadata: {
          subtaskId: subtask.id,
          title: subtask.title
        },
        importance: 0.8
      });
    }

    return {
      type: 'research',
      success: true,
      knowledge: consolidatedKnowledge,
      deliverables: learningResults.map(r => `Conocimiento sobre: ${r.query}`)
    };
  }

  /**
   * Ejecuta sub-tarea de tipo CODE
   * Genera código usando Ollama + conocimiento adquirido
   */
  async executeCode(subtask, context) {
    console.log('💻 [Execution Engine] Tipo: Code');

    // 1. Buscar conocimiento relevante
    let relevantKnowledge = '';
    if (this.memoryManager) {
      const memories = await this.memoryManager.recall(subtask.description, 5);
      if (memories.length > 0) {
        relevantKnowledge = memories.map(m => JSON.stringify(m.content)).join('\n');
      }
    }

    // 2. Generar código con Ollama
    const prompt = `Genera código para esta tarea:

Título: ${subtask.title}
Descripción: ${subtask.description}

Contexto del proyecto:
${JSON.stringify(context, null, 2)}

Conocimiento relevante disponible:
${relevantKnowledge.substring(0, 2000)}

Requisitos:
${subtask.deliverables.join('\n')}

Criterios de verificación:
${subtask.verificationCriteria.join('\n')}

Por favor genera:
1. El código completo y funcional
2. Comentarios explicativos
3. Tests básicos si aplica

Responde en formato JSON:
{
  "files": [
    {
      "path": "ruta/del/archivo.js",
      "content": "contenido del archivo",
      "description": "qué hace este archivo"
    }
  ],
  "explanation": "explicación de la solución",
  "nextSteps": ["paso1", "paso2"]
}`;

    const response = await this.callOllama(prompt);
    const codeResult = this.parseJSON(response);

    if (!codeResult || !codeResult.files) {
      throw new Error('No se pudo generar código válido');
    }

    // 3. Escribir archivos generados
    const createdFiles = [];
    for (const file of codeResult.files) {
      const fullPath = path.join(this.projectRoot, file.path);
      const dir = path.dirname(fullPath);

      // Crear directorio si no existe
      await fs.mkdir(dir, { recursive: true });

      // Escribir archivo
      await fs.writeFile(fullPath, file.content, 'utf-8');

      createdFiles.push({
        path: file.path,
        fullPath,
        description: file.description
      });

      console.log(`   ✅ Creado: ${file.path}`);
    }

    // 4. Guardar en memoria
    if (this.memoryManager) {
      await this.memoryManager.store({
        type: 'code-generation',
        content: {
          subtask: subtask.title,
          files: createdFiles,
          explanation: codeResult.explanation
        },
        metadata: {
          subtaskId: subtask.id
        },
        importance: 0.9
      });
    }

    return {
      type: 'code',
      success: true,
      files: createdFiles,
      explanation: codeResult.explanation,
      nextSteps: codeResult.nextSteps,
      deliverables: createdFiles.map(f => f.path)
    };
  }

  /**
   * Ejecuta sub-tarea de tipo TEST
   * Ejecuta tests y verifica resultados
   */
  async executeTest(subtask, context) {
    console.log('🧪 [Execution Engine] Tipo: Test');

    // 1. Determinar comando de test
    const testCommand = this.determineTestCommand(subtask, context);

    console.log(`   Ejecutando: ${testCommand}`);

    // 2. Ejecutar tests
    let testOutput;
    try {
      const { stdout, stderr } = await execPromise(testCommand, {
        cwd: this.projectRoot,
        timeout: 60000
      });
      testOutput = stdout + stderr;
    } catch (error) {
      testOutput = error.stdout + error.stderr;
      throw new Error(`Tests fallaron: ${error.message}\n${testOutput}`);
    }

    // 3. Analizar resultados
    const testResults = this.parseTestOutput(testOutput);

    console.log(`   ✅ Tests pasados: ${testResults.passed}/${testResults.total}`);

    // 4. Guardar en memoria
    if (this.memoryManager) {
      await this.memoryManager.store({
        type: 'test-execution',
        content: {
          subtask: subtask.title,
          command: testCommand,
          results: testResults
        },
        metadata: {
          subtaskId: subtask.id
        },
        importance: 0.7
      });
    }

    return {
      type: 'test',
      success: true,
      testResults,
      command: testCommand,
      deliverables: [`Tests ejecutados: ${testResults.passed}/${testResults.total} pasados`]
    };
  }

  /**
   * Ejecuta sub-tarea de tipo DOCUMENT
   * Genera documentación
   */
  async executeDocument(subtask, context) {
    console.log('📝 [Execution Engine] Tipo: Document');

    // 1. Recopilar información para documentar
    const info = await this.gatherDocumentationInfo(subtask, context);

    // 2. Generar documentación con Ollama
    const prompt = `Genera documentación profesional para:

Título: ${subtask.title}
Descripción: ${subtask.description}

Información recopilada:
${JSON.stringify(info, null, 2)}

Requisitos:
${subtask.deliverables.join('\n')}

Por favor genera documentación en formato Markdown incluyendo:
1. Título y descripción
2. Instalación/Setup (si aplica)
3. Uso y ejemplos
4. API/Métodos principales
5. Ejemplos de código
6. Notas importantes

Responde solo con el contenido Markdown, sin JSON.`;

    const documentation = await this.callOllama(prompt);

    // 3. Determinar nombre de archivo
    const docFileName = this.determineDocFileName(subtask, context);
    const docPath = path.join(this.projectRoot, docFileName);

    // 4. Escribir documentación
    await fs.writeFile(docPath, documentation, 'utf-8');

    console.log(`   ✅ Documentación creada: ${docFileName}`);

    // 5. Guardar en memoria
    if (this.memoryManager) {
      await this.memoryManager.store({
        type: 'documentation',
        content: {
          subtask: subtask.title,
          file: docFileName,
          documentation: documentation.substring(0, 1000)
        },
        metadata: {
          subtaskId: subtask.id
        },
        importance: 0.6
      });
    }

    return {
      type: 'document',
      success: true,
      file: docFileName,
      deliverables: [docFileName]
    };
  }

  /**
   * Ejecuta sub-tarea de tipo DEPLOY
   * Despliega código o ejecuta comandos
   */
  async executeDeploy(subtask, context) {
    console.log('🚀 [Execution Engine] Tipo: Deploy');

    // Determinar comando de deploy
    const deployCommand = this.determineDeployCommand(subtask, context);

    console.log(`   Ejecutando: ${deployCommand}`);

    // Ejecutar comando
    let output;
    try {
      const { stdout, stderr } = await execPromise(deployCommand, {
        cwd: this.projectRoot,
        timeout: 120000
      });
      output = stdout + stderr;
    } catch (error) {
      output = error.stdout + error.stderr;
      throw new Error(`Deploy falló: ${error.message}\n${output}`);
    }

    console.log(`   ✅ Deploy exitoso`);

    return {
      type: 'deploy',
      success: true,
      command: deployCommand,
      output: output.substring(0, 1000),
      deliverables: ['Deploy completado']
    };
  }

  /**
   * Ejecuta sub-tarea genérica
   */
  async executeGeneric(subtask, context) {
    console.log('🔧 [Execution Engine] Tipo: Generic');

    // Usar Ollama para determinar qué hacer
    const prompt = `Analiza esta tarea y determina cómo ejecutarla:

Título: ${subtask.title}
Descripción: ${subtask.description}
Tipo: ${subtask.type}

Contexto:
${JSON.stringify(context, null, 2)}

¿Qué pasos concretos debería seguir? Responde con un plan de acción.`;

    const actionPlan = await this.callOllama(prompt);

    return {
      type: 'generic',
      success: true,
      actionPlan,
      deliverables: ['Tarea analizada']
    };
  }

  /**
   * Extrae queries de investigación de la descripción
   */
  extractResearchQueries(subtask) {
    const queries = [];

    // Query principal: el título de la tarea
    queries.push(subtask.title);

    // Extraer queries adicionales de la descripción
    const description = subtask.description.toLowerCase();

    // Buscar patrones como "buscar", "investigar", "aprender sobre"
    const patterns = [
      /buscar\s+(?:sobre\s+)?([^.,;]+)/gi,
      /investigar\s+(?:sobre\s+)?([^.,;]+)/gi,
      /aprender\s+(?:sobre\s+)?([^.,;]+)/gi,
      /información\s+(?:sobre\s+)?([^.,;]+)/gi
    ];

    patterns.forEach(pattern => {
      let match;
      while ((match = pattern.exec(description)) !== null) {
        queries.push(match[1].trim());
      }
    });

    return [...new Set(queries)].slice(0, 5); // Máximo 5 queries únicas
  }

  /**
   * Determina comando de test a ejecutar
   */
  determineTestCommand(subtask, context) {
    const description = subtask.description.toLowerCase();

    // Buscar comando explícito
    if (description.includes('npm test')) return 'npm test';
    if (description.includes('jest')) return 'npm run test';
    if (description.includes('pytest')) return 'pytest';
    if (description.includes('mocha')) return 'npm run test';

    // Default: intentar npm test
    return 'npm test';
  }

  /**
   * Parsea output de tests
   */
  parseTestOutput(output) {
    const results = {
      total: 0,
      passed: 0,
      failed: 0,
      output: output.substring(0, 500)
    };

    // Jest/npm test
    const jestMatch = output.match(/Tests:\s+(\d+)\s+passed.*?(\d+)\s+total/);
    if (jestMatch) {
      results.passed = parseInt(jestMatch[1]);
      results.total = parseInt(jestMatch[2]);
      results.failed = results.total - results.passed;
      return results;
    }

    // Pytest
    const pytestMatch = output.match(/(\d+)\s+passed/);
    if (pytestMatch) {
      results.passed = parseInt(pytestMatch[1]);
      results.total = results.passed;
      return results;
    }

    // Fallback: buscar "passing"
    const passingMatch = output.match(/(\d+)\s+passing/);
    if (passingMatch) {
      results.passed = parseInt(passingMatch[1]);
      results.total = results.passed;
    }

    return results;
  }

  /**
   * Recopila información para documentación
   */
  async gatherDocumentationInfo(subtask, context) {
    const info = {
      project: context.projectName || 'Proyecto',
      description: subtask.description,
      relatedFiles: []
    };

    // Buscar archivos relacionados mencionados en deliverables
    for (const deliverable of subtask.deliverables) {
      if (deliverable.includes('.js') || deliverable.includes('.cjs') || deliverable.includes('.ts')) {
        info.relatedFiles.push(deliverable);
      }
    }

    // Obtener memoria relacionada
    if (this.memoryManager) {
      const memories = await this.memoryManager.recall(subtask.description, 3);
      info.recentWork = memories.map(m => m.content);
    }

    return info;
  }

  /**
   * Determina nombre de archivo de documentación
   */
  determineDocFileName(subtask, context) {
    const title = subtask.title.toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-');

    // Si es README principal
    if (title.includes('readme') || title.includes('documentation') || title.includes('principal')) {
      return 'README.md';
    }

    // Si menciona un módulo específico
    for (const deliverable of subtask.deliverables) {
      if (deliverable.endsWith('.md')) {
        return deliverable;
      }
    }

    // Default: basado en el título
    return `docs/${title}.md`;
  }

  /**
   * Determina comando de deploy
   */
  determineDeployCommand(subtask, context) {
    const description = subtask.description.toLowerCase();

    if (description.includes('npm install')) return 'npm install';
    if (description.includes('npm run build')) return 'npm run build';
    if (description.includes('docker')) return 'docker build -t app .';
    if (description.includes('git push')) return 'git push';

    // Default: npm install
    return 'npm install';
  }

  /**
   * Llama a Ollama
   */
  async callOllama(prompt) {
    const response = await axios.post(
      `${this.ollamaUrl}/api/generate`,
      {
        model: this.model,
        prompt: prompt,
        stream: false,
        options: {
          temperature: 0.3,
          num_predict: 3000
        }
      },
      { timeout: this.timeout }
    );

    return response.data.response;
  }

  /**
   * Parsea JSON de respuesta
   */
  parseJSON(text) {
    try {
      return JSON.parse(text);
    } catch (e) {
      const jsonMatch = text.match(/\{[\s\S]*\}|\[[\s\S]*\]/);
      if (jsonMatch) {
        try {
          return JSON.parse(jsonMatch[0]);
        } catch (e2) {
          return null;
        }
      }
      return null;
    }
  }

  /**
   * Sleep helper
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Obtiene resultados de ejecución
   */
  getExecutionResults() {
    return {
      total: this.executionResults.length,
      successful: this.executionResults.filter(r => r.success).length,
      failed: this.executionResults.filter(r => !r.success).length,
      results: this.executionResults
    };
  }

  /**
   * Limpia resultados
   */
  clearResults() {
    this.executionResults = [];
  }
}

module.exports = ExecutionEngine;

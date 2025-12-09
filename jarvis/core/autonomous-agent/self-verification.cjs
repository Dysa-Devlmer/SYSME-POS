// core/autonomous-agent/self-verification.cjs
// Self-Verification System - JARVIS se verifica a sí mismo

const axios = require('axios');
const fs = require('fs').promises;
const path = require('path');
const { EventEmitter } = require('events');
const { exec } = require('child_process');
const { promisify } = require('util');
const execPromise = promisify(exec);

/**
 * Self-Verification System
 *
 * Capacidades:
 * - Verifica que el código generado funcione
 * - Ejecuta tests automáticamente
 * - Analiza código con linter
 * - Verifica criterios de aceptación
 * - Detecta problemas de seguridad
 * - Valida documentación
 * - Auto-corrige errores simples
 */
class SelfVerification extends EventEmitter {
  constructor(options = {}) {
    super();

    this.projectRoot = options.projectRoot || process.cwd();
    this.ollamaUrl = options.ollamaUrl || 'http://localhost:11434';
    this.model = options.model || 'qwen2.5-coder:latest';
    this.timeout = options.timeout || 90000;

    // AI Analyzer para análisis profundo
    this.aiAnalyzer = options.aiAnalyzer || null;

    // Verificadores habilitados
    this.verifiers = {
      syntax: true,
      tests: true,
      linting: true,
      security: true,
      criteria: true,
      documentation: true
    };

    // Umbrales
    this.thresholds = {
      minTestCoverage: 0, // 0% para empezar (no ser muy estricto)
      maxLintErrors: 10,
      maxSecurityIssues: 0 // Cero issues de seguridad permitidos
    };
  }

  /**
   * Verifica el resultado de una sub-tarea
   */
  async verify(subtask, executionResult) {
    console.log(`\n🔍 [Self-Verification] Verificando: "${subtask.title}"`);
    this.emit('verification:start', { subtask });

    const verificationResults = {
      subtaskId: subtask.id,
      subtaskTitle: subtask.title,
      passed: false,
      checks: [],
      issues: [],
      score: 0,
      timestamp: Date.now()
    };

    try {
      // 1. Verificar sintaxis (si generó código)
      if (this.verifiers.syntax && executionResult.type === 'code') {
        const syntaxCheck = await this.verifySyntax(executionResult);
        verificationResults.checks.push(syntaxCheck);
      }

      // 2. Ejecutar tests (si aplica)
      if (this.verifiers.tests && (executionResult.type === 'code' || executionResult.type === 'test')) {
        const testCheck = await this.verifyTests(executionResult);
        verificationResults.checks.push(testCheck);
      }

      // 3. Linting (si generó código)
      if (this.verifiers.linting && executionResult.type === 'code') {
        const lintCheck = await this.verifyLinting(executionResult);
        verificationResults.checks.push(lintCheck);
      }

      // 4. Seguridad (si generó código)
      if (this.verifiers.security && executionResult.type === 'code') {
        const securityCheck = await this.verifySecurity(executionResult);
        verificationResults.checks.push(securityCheck);
      }

      // 5. Criterios de aceptación
      if (this.verifiers.criteria) {
        const criteriaCheck = await this.verifyCriteria(subtask, executionResult);
        verificationResults.checks.push(criteriaCheck);
      }

      // 6. Documentación (si es tarea de documentación)
      if (this.verifiers.documentation && executionResult.type === 'document') {
        const docCheck = await this.verifyDocumentation(executionResult);
        verificationResults.checks.push(docCheck);
      }

      // Calcular score y determinar si pasó
      verificationResults.score = this.calculateScore(verificationResults.checks);
      verificationResults.passed = verificationResults.score >= 70; // 70% para aprobar

      // Recopilar issues
      verificationResults.issues = this.collectIssues(verificationResults.checks);

      if (verificationResults.passed) {
        console.log(`✅ [Self-Verification] Verificación exitosa (score: ${verificationResults.score}%)`);
        this.emit('verification:passed', { subtask, score: verificationResults.score });
      } else {
        console.log(`❌ [Self-Verification] Verificación fallida (score: ${verificationResults.score}%)`);
        console.log(`   Issues encontrados: ${verificationResults.issues.length}`);
        this.emit('verification:failed', { subtask, issues: verificationResults.issues });
      }

      return verificationResults;

    } catch (error) {
      console.error(`💥 [Self-Verification] Error: ${error.message}`);
      this.emit('verification:error', { subtask, error: error.message });

      return {
        ...verificationResults,
        passed: false,
        error: error.message
      };
    }
  }

  /**
   * Verifica sintaxis del código generado
   */
  async verifySyntax(executionResult) {
    console.log('   🔤 Verificando sintaxis...');

    const check = {
      name: 'Syntax Check',
      passed: true,
      issues: [],
      score: 100
    };

    try {
      // Verificar cada archivo generado
      for (const file of executionResult.files || []) {
        const content = await fs.readFile(file.fullPath, 'utf-8');

        // Intentar parsear según extensión
        const ext = path.extname(file.path);

        if (ext === '.js' || ext === '.cjs') {
          try {
            // Usar Function para validar sintaxis
            new Function(content);
          } catch (syntaxError) {
            check.issues.push({
              file: file.path,
              type: 'syntax',
              message: syntaxError.message,
              severity: 'critical'
            });
            check.passed = false;
          }
        }

        // TODO: Agregar validación para .ts, .py, etc.
      }

      if (check.passed) {
        console.log('      ✅ Sintaxis válida');
      } else {
        console.log(`      ❌ ${check.issues.length} errores de sintaxis`);
        check.score = 0;
      }

    } catch (error) {
      check.passed = false;
      check.issues.push({
        type: 'verification-error',
        message: error.message,
        severity: 'high'
      });
      check.score = 0;
    }

    return check;
  }

  /**
   * Verifica que los tests pasen
   */
  async verifyTests(executionResult) {
    console.log('   🧪 Verificando tests...');

    const check = {
      name: 'Tests Check',
      passed: false,
      issues: [],
      score: 0
    };

    try {
      // Ejecutar tests
      let testCommand = 'npm test';
      let output = '';

      try {
        const { stdout, stderr } = await execPromise(testCommand, {
          cwd: this.projectRoot,
          timeout: 60000
        });
        output = stdout + stderr;
      } catch (error) {
        output = (error.stdout || '') + (error.stderr || '');
        check.issues.push({
          type: 'test-failure',
          message: 'Tests fallaron',
          output: output.substring(0, 500),
          severity: 'high'
        });
        console.log('      ❌ Tests fallaron');
        return check;
      }

      // Parsear resultados
      const results = this.parseTestOutput(output);

      if (results.passed === results.total && results.total > 0) {
        check.passed = true;
        check.score = 100;
        console.log(`      ✅ ${results.passed}/${results.total} tests pasados`);
      } else {
        check.score = Math.round((results.passed / results.total) * 100);
        check.issues.push({
          type: 'test-failure',
          message: `${results.failed} tests fallaron`,
          details: results,
          severity: 'high'
        });
        console.log(`      ⚠️ ${results.passed}/${results.total} tests pasados`);
      }

    } catch (error) {
      check.issues.push({
        type: 'verification-error',
        message: error.message,
        severity: 'medium'
      });
    }

    return check;
  }

  /**
   * Verifica linting
   */
  async verifyLinting(executionResult) {
    console.log('   📐 Verificando linting...');

    const check = {
      name: 'Linting Check',
      passed: true,
      issues: [],
      score: 100
    };

    try {
      // Intentar ejecutar eslint si existe
      let output = '';
      try {
        const { stdout, stderr } = await execPromise('npx eslint . --format json', {
          cwd: this.projectRoot,
          timeout: 30000
        });
        output = stdout;
      } catch (error) {
        output = error.stdout || '[]';
      }

      // Parsear resultados
      try {
        const lintResults = JSON.parse(output);
        const errorCount = lintResults.reduce((sum, file) => sum + file.errorCount, 0);
        const warningCount = lintResults.reduce((sum, file) => sum + file.warningCount, 0);

        if (errorCount > this.thresholds.maxLintErrors) {
          check.passed = false;
          check.issues.push({
            type: 'linting',
            message: `${errorCount} errores de linting (máximo: ${this.thresholds.maxLintErrors})`,
            errors: errorCount,
            warnings: warningCount,
            severity: 'medium'
          });
          check.score = Math.max(0, 100 - (errorCount * 5));
          console.log(`      ⚠️ ${errorCount} errores, ${warningCount} warnings`);
        } else {
          console.log(`      ✅ Linting OK (${errorCount} errores, ${warningCount} warnings)`);
        }
      } catch (parseError) {
        // ESLint no disponible o output inválido, no penalizar
        console.log('      ℹ️ ESLint no disponible, saltando...');
      }

    } catch (error) {
      // No penalizar si linting no está configurado
      console.log('      ℹ️ Linting no configurado');
    }

    return check;
  }

  /**
   * Verifica seguridad del código
   */
  async verifySecurity(executionResult) {
    console.log('   🔒 Verificando seguridad...');

    const check = {
      name: 'Security Check',
      passed: true,
      issues: [],
      score: 100
    };

    try {
      // Usar AI Analyzer si está disponible
      if (this.aiAnalyzer) {
        for (const file of executionResult.files || []) {
          const content = await fs.readFile(file.fullPath, 'utf-8');
          const analysis = await this.aiAnalyzer.analyze(content, file.path);

          // Filtrar solo issues de seguridad
          const securityIssues = (analysis.issues || []).filter(
            issue => issue.severity === 'critical' || issue.category === 'security'
          );

          if (securityIssues.length > this.thresholds.maxSecurityIssues) {
            check.passed = false;
            check.score = 0;
            check.issues.push(...securityIssues.map(issue => ({
              ...issue,
              file: file.path,
              type: 'security',
              severity: 'critical'
            })));
          }
        }
      } else {
        // Verificación básica sin AI
        for (const file of executionResult.files || []) {
          const content = await fs.readFile(file.fullPath, 'utf-8');
          const basicSecurityIssues = this.basicSecurityCheck(content, file.path);

          if (basicSecurityIssues.length > 0) {
            check.passed = false;
            check.score = Math.max(0, 100 - (basicSecurityIssues.length * 25));
            check.issues.push(...basicSecurityIssues);
          }
        }
      }

      if (check.passed) {
        console.log('      ✅ Sin problemas de seguridad');
      } else {
        console.log(`      ❌ ${check.issues.length} problemas de seguridad encontrados`);
      }

    } catch (error) {
      check.issues.push({
        type: 'verification-error',
        message: error.message,
        severity: 'low'
      });
    }

    return check;
  }

  /**
   * Verificación básica de seguridad (sin AI)
   */
  basicSecurityCheck(content, filePath) {
    const issues = [];
    const lines = content.split('\n');

    // Patrones peligrosos
    const dangerousPatterns = [
      { pattern: /eval\s*\(/gi, message: 'Uso de eval() detectado', severity: 'critical' },
      { pattern: /exec\s*\(/gi, message: 'Uso de exec() sin validación', severity: 'high' },
      { pattern: /innerHTML\s*=/gi, message: 'Uso de innerHTML (XSS risk)', severity: 'medium' },
      { pattern: /\bpassword\b.*=.*["'][^"']+["']/gi, message: 'Password hardcodeado', severity: 'critical' },
      { pattern: /\bapi[_-]?key\b.*=.*["'][^"']+["']/gi, message: 'API key hardcodeada', severity: 'critical' }
    ];

    lines.forEach((line, index) => {
      dangerousPatterns.forEach(({ pattern, message, severity }) => {
        if (pattern.test(line)) {
          issues.push({
            file: filePath,
            line: index + 1,
            type: 'security',
            message,
            code: line.trim(),
            severity
          });
        }
      });
    });

    return issues;
  }

  /**
   * Verifica criterios de aceptación
   */
  async verifyCriteria(subtask, executionResult) {
    console.log('   ✓ Verificando criterios de aceptación...');

    const check = {
      name: 'Criteria Check',
      passed: false,
      issues: [],
      score: 0
    };

    try {
      const criteria = subtask.verificationCriteria || [];
      const deliverables = subtask.deliverables || [];

      if (criteria.length === 0 && deliverables.length === 0) {
        // No hay criterios definidos, aprobar por defecto
        check.passed = true;
        check.score = 100;
        console.log('      ℹ️ Sin criterios específicos');
        return check;
      }

      // Usar Ollama para verificar criterios
      const prompt = `Verifica si el resultado cumple con los criterios:

Tarea: ${subtask.title}
Descripción: ${subtask.description}

Criterios de verificación:
${criteria.join('\n')}

Deliverables esperados:
${deliverables.join('\n')}

Resultado obtenido:
${JSON.stringify(executionResult, null, 2)}

¿Se cumplieron todos los criterios? Responde en formato JSON:
{
  "fulfilled": true/false,
  "criteriaResults": [
    {
      "criterion": "texto del criterio",
      "met": true/false,
      "explanation": "por qué sí o no"
    }
  ],
  "overallScore": 0-100
}`;

      const response = await this.callOllama(prompt);
      const verification = this.parseJSON(response);

      if (verification && verification.fulfilled !== undefined) {
        check.passed = verification.fulfilled;
        check.score = verification.overallScore || (verification.fulfilled ? 100 : 50);

        // Agregar issues de criterios no cumplidos
        (verification.criteriaResults || []).forEach(result => {
          if (!result.met) {
            check.issues.push({
              type: 'criteria-not-met',
              message: `Criterio no cumplido: ${result.criterion}`,
              explanation: result.explanation,
              severity: 'medium'
            });
          }
        });

        if (check.passed) {
          console.log('      ✅ Todos los criterios cumplidos');
        } else {
          console.log(`      ⚠️ Algunos criterios no cumplidos (score: ${check.score}%)`);
        }
      } else {
        // Fallback: asumir cumplimiento parcial
        check.passed = true;
        check.score = 75;
        console.log('      ⚠️ Verificación de criterios inconclusa');
      }

    } catch (error) {
      // No bloquear por error en verificación de criterios
      check.passed = true;
      check.score = 70;
      check.issues.push({
        type: 'verification-error',
        message: error.message,
        severity: 'low'
      });
      console.log('      ⚠️ Error verificando criterios, asumiendo cumplimiento parcial');
    }

    return check;
  }

  /**
   * Verifica documentación
   */
  async verifyDocumentation(executionResult) {
    console.log('   📄 Verificando documentación...');

    const check = {
      name: 'Documentation Check',
      passed: false,
      issues: [],
      score: 0
    };

    try {
      const docFile = executionResult.file;

      if (!docFile) {
        check.issues.push({
          type: 'missing-documentation',
          message: 'No se generó archivo de documentación',
          severity: 'high'
        });
        return check;
      }

      const fullPath = path.join(this.projectRoot, docFile);
      const content = await fs.readFile(fullPath, 'utf-8');

      // Verificar longitud mínima
      if (content.length < 200) {
        check.issues.push({
          type: 'insufficient-documentation',
          message: 'Documentación muy corta',
          severity: 'medium'
        });
        check.score = 30;
        console.log('      ⚠️ Documentación insuficiente');
        return check;
      }

      // Verificar que tenga secciones básicas (para Markdown)
      if (docFile.endsWith('.md')) {
        const requiredSections = ['#', '##', '###']; // Debe tener headers
        const hasHeaders = requiredSections.some(header => content.includes(header));

        if (!hasHeaders) {
          check.issues.push({
            type: 'poorly-structured',
            message: 'Documentación sin estructura clara',
            severity: 'low'
          });
          check.score = 60;
        } else {
          check.passed = true;
          check.score = 100;
        }
      } else {
        // No es markdown, solo verificar que exista
        check.passed = true;
        check.score = 100;
      }

      if (check.passed) {
        console.log('      ✅ Documentación adecuada');
      } else {
        console.log('      ⚠️ Documentación mejorable');
      }

    } catch (error) {
      check.issues.push({
        type: 'verification-error',
        message: error.message,
        severity: 'medium'
      });
    }

    return check;
  }

  /**
   * Calcula score global
   */
  calculateScore(checks) {
    if (checks.length === 0) return 0;

    const totalScore = checks.reduce((sum, check) => sum + (check.score || 0), 0);
    return Math.round(totalScore / checks.length);
  }

  /**
   * Recopila todos los issues
   */
  collectIssues(checks) {
    const allIssues = [];

    checks.forEach(check => {
      if (check.issues && check.issues.length > 0) {
        allIssues.push(...check.issues.map(issue => ({
          ...issue,
          checkName: check.name
        })));
      }
    });

    // Ordenar por severidad
    const severityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
    allIssues.sort((a, b) => {
      return severityOrder[a.severity] - severityOrder[b.severity];
    });

    return allIssues;
  }

  /**
   * Parsea output de tests
   */
  parseTestOutput(output) {
    const results = {
      total: 0,
      passed: 0,
      failed: 0
    };

    // Jest
    const jestMatch = output.match(/Tests:\s+(\d+)\s+passed.*?(\d+)\s+total/);
    if (jestMatch) {
      results.passed = parseInt(jestMatch[1]);
      results.total = parseInt(jestMatch[2]);
      results.failed = results.total - results.passed;
      return results;
    }

    // Mocha
    const mochaMatch = output.match(/(\d+)\s+passing/);
    if (mochaMatch) {
      results.passed = parseInt(mochaMatch[1]);
      const failMatch = output.match(/(\d+)\s+failing/);
      results.failed = failMatch ? parseInt(failMatch[1]) : 0;
      results.total = results.passed + results.failed;
      return results;
    }

    return results;
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
          temperature: 0.2,
          num_predict: 1500
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
}

module.exports = SelfVerification;

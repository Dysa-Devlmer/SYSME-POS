// core/proactive/fix-engine.cjs
// Motor de corrección automática de código

const fs = require('fs-extra');
const path = require('path');
const { EventEmitter } = require('events');

class FixEngine extends EventEmitter {
  constructor(options = {}) {
    super();

    this.projectRoot = options.projectRoot || process.cwd();
    this.dryRun = options.dryRun || false; // Si true, no aplica cambios reales
    this.patternDatabase = options.patternDatabase || null; // Learning system
    this.learningEnabled = options.learningEnabled !== false;

    // Estrategias de fix pre-definidas
    this.fixStrategies = {
      // Security fixes
      // 'eval-usage': this.fixEvalUsage.bind(this),
      // 'sql-injection': this.fixSQLInjection.bind(this),
      // 'xss-vulnerability': this.fixXSSVulnerability.bind(this),

      // Performance fixes
      // 'inefficient-loop': this.fixInefficientLoop.bind(this),
      // 'unnecessary-re-render': this.fixUnnecessaryReRender.bind(this),

      // Bug fixes
      // 'null-reference': this.fixNullReference.bind(this),
      // 'undefined-variable': this.fixUndefinedVariable.bind(this),
      // 'missing-await': this.fixMissingAwait.bind(this),

      // Code quality
      // 'missing-error-handling': this.fixMissingErrorHandling.bind(this),
      // 'unused-variable': this.fixUnusedVariable.bind(this)

      // TODO: Implementar estrategias de fix cuando se necesiten
    };

    // Stats
    this.stats = {
      totalFixes: 0,
      successful: 0,
      failed: 0,
      byType: {}
    };
  }

  /**
   * Aplica un fix basado en el análisis de IA
   */
  async applyFix(filePath, issue, analysis) {
    const fullPath = path.join(this.projectRoot, filePath);

    console.log(`🔧 [Fix Engine] Intentando fix: ${filePath}:${issue.line}`);
    console.log(`   Tipo: ${issue.type || 'unknown'}`);
    console.log(`   Descripción: ${issue.description || issue.issue || issue.problem}`);

    try {
      // Leer archivo
      const content = await fs.readFile(fullPath, 'utf-8');
      const lines = content.split('\n');

      // Determinar estrategia de fix
      const strategy = this.determineStrategy(issue, content);

      if (!strategy) {
        console.log(`⚠️ [Fix Engine] No hay estrategia para este tipo de issue`);
        return {
          success: false,
          reason: 'No strategy available',
          issue
        };
      }

      // Aplicar fix
      const result = await strategy(lines, issue, analysis);

      if (!result.success) {
        console.log(`❌ [Fix Engine] Fix falló: ${result.reason}`);
        this.stats.failed++;
        return result;
      }

      // Aplicar cambios
      if (!this.dryRun) {
        await fs.writeFile(fullPath, result.newContent, 'utf-8');
        console.log(`✅ [Fix Engine] Fix aplicado exitosamente`);
      } else {
        console.log(`✅ [Fix Engine] Fix simulado (dry-run)`);
      }

      this.stats.totalFixes++;
      this.stats.successful++;
      this.stats.byType[issue.type] = (this.stats.byType[issue.type] || 0) + 1;

      this.emit('fix:applied', {
        filePath,
        issue,
        changes: result.changes,
        dryRun: this.dryRun,
        timestamp: Date.now()
      });

      // Learning: Registrar fix exitoso en Pattern Database
      if (this.learningEnabled && this.patternDatabase && !this.dryRun) {
        await this.learnFromFix(filePath, issue, content, result);
      }

      return {
        success: true,
        filePath,
        changes: result.changes,
        newContent: result.newContent
      };

    } catch (error) {
      console.error(`❌ [Fix Engine] Error aplicando fix:`, error.message);
      this.stats.failed++;

      return {
        success: false,
        reason: error.message,
        issue
      };
    }
  }

  /**
   * Determina qué estrategia usar
   */
  determineStrategy(issue, content) {
    const description = (issue.description || issue.issue || issue.problem || '').toLowerCase();
    const suggestion = (issue.suggestion || issue.fix || issue.solution || '').toLowerCase();

    // Security
    if (description.includes('eval')) return this.fixStrategies['eval-usage'];
    if (description.includes('sql injection')) return this.fixStrategies['sql-injection'];
    if (description.includes('xss')) return this.fixStrategies['xss-vulnerability'];

    // Performance
    if (description.includes('loop') || description.includes('o(n²)')) {
      return this.fixStrategies['inefficient-loop'];
    }

    // Bugs
    if (description.includes('null') || description.includes('undefined')) {
      return this.fixStrategies['null-reference'];
    }
    if (description.includes('await') || description.includes('async')) {
      return this.fixStrategies['missing-await'];
    }

    // Code quality
    if (description.includes('error handling') || description.includes('try-catch')) {
      return this.fixStrategies['missing-error-handling'];
    }

    // Si la sugerencia es clara, usar fix genérico
    if (suggestion && suggestion.length > 10) {
      return this.genericFix.bind(this);
    }

    return null;
  }

  /**
   * Fix: eval() usage
   */
  async fixEvalUsage(lines, issue) {
    const lineIndex = issue.line - 1;
    const originalLine = lines[lineIndex];

    // Detectar uso de eval
    const evalMatch = originalLine.match(/eval\s*\(\s*([^)]+)\s*\)/);

    if (!evalMatch) {
      return { success: false, reason: 'No eval found on specified line' };
    }

    // Reemplazar eval con JSON.parse si parece JSON
    const newLine = originalLine.replace(/eval\s*\(\s*([^)]+)\s*\)/, 'JSON.parse($1)');

    lines[lineIndex] = newLine;

    return {
      success: true,
      newContent: lines.join('\n'),
      changes: [{
        line: issue.line,
        old: originalLine.trim(),
        new: newLine.trim(),
        description: 'Replaced eval() with JSON.parse()'
      }]
    };
  }

  /**
   * Fix: SQL Injection vulnerability
   */
  async fixSQLInjection(lines, issue) {
    const lineIndex = issue.line - 1;
    const originalLine = lines[lineIndex];

    // Buscar concatenación directa en query
    const directConcatMatch = originalLine.match(/(['"`])SELECT.*?\1\s*\+/);

    if (directConcatMatch) {
      // Comentar la línea y agregar sugerencia
      const comment = `// TODO: Use parameterized queries instead of string concatenation`;
      lines.splice(lineIndex, 0, comment);

      return {
        success: true,
        newContent: lines.join('\n'),
        changes: [{
          line: issue.line,
          old: originalLine.trim(),
          new: `${comment}\n${originalLine}`,
          description: 'Added warning comment for SQL injection vulnerability'
        }]
      };
    }

    return { success: false, reason: 'Could not identify SQL concatenation pattern' };
  }

  /**
   * Fix: XSS vulnerability
   */
  async fixXSSVulnerability(lines, issue) {
    const lineIndex = issue.line - 1;
    const originalLine = lines[lineIndex];

    // Detectar innerHTML
    if (originalLine.includes('innerHTML')) {
      const newLine = originalLine.replace(/innerHTML/g, 'textContent');

      lines[lineIndex] = newLine;

      return {
        success: true,
        newContent: lines.join('\n'),
        changes: [{
          line: issue.line,
          old: originalLine.trim(),
          new: newLine.trim(),
          description: 'Replaced innerHTML with textContent to prevent XSS'
        }]
      };
    }

    return { success: false, reason: 'No innerHTML usage found' };
  }

  /**
   * Fix: Inefficient loop
   */
  async fixInefficientLoop(lines, issue) {
    // Para loops O(n²), agregar comentario con sugerencia
    const lineIndex = issue.line - 1;
    const originalLine = lines[lineIndex];

    const comment = `// PERFORMANCE: Consider using Map/Set for O(1) lookup instead of nested loop`;
    lines.splice(lineIndex, 0, comment);

    return {
      success: true,
      newContent: lines.join('\n'),
      changes: [{
        line: issue.line,
        old: originalLine.trim(),
        new: `${comment}\n${originalLine}`,
        description: 'Added performance optimization suggestion'
      }]
    };
  }

  /**
   * Fix: Unnecessary re-render (React)
   */
  async fixUnnecessaryReRender(lines, issue) {
    const lineIndex = issue.line - 1;
    const originalLine = lines[lineIndex];

    // Sugerir useMemo o useCallback
    const comment = `// OPTIMIZATION: Consider using useMemo/useCallback here`;
    lines.splice(lineIndex, 0, comment);

    return {
      success: true,
      newContent: lines.join('\n'),
      changes: [{
        line: issue.line,
        old: originalLine.trim(),
        new: `${comment}\n${originalLine}`,
        description: 'Added React optimization suggestion'
      }]
    };
  }

  /**
   * Fix: Null reference
   */
  async fixNullReference(lines, issue) {
    const lineIndex = issue.line - 1;
    const originalLine = lines[lineIndex];

    // Detectar acceso a property sin validación
    const propertyAccessMatch = originalLine.match(/(\w+)\.(\w+)/);

    if (propertyAccessMatch) {
      const [, obj, prop] = propertyAccessMatch;

      // Agregar optional chaining
      const newLine = originalLine.replace(
        new RegExp(`${obj}\\.${prop}`, 'g'),
        `${obj}?.${prop}`
      );

      lines[lineIndex] = newLine;

      return {
        success: true,
        newContent: lines.join('\n'),
        changes: [{
          line: issue.line,
          old: originalLine.trim(),
          new: newLine.trim(),
          description: 'Added optional chaining to prevent null reference'
        }]
      };
    }

    return { success: false, reason: 'Could not identify property access pattern' };
  }

  /**
   * Fix: Missing await
   */
  async fixMissingAwait(lines, issue) {
    const lineIndex = issue.line - 1;
    const originalLine = lines[lineIndex];

    // Detectar llamada a función async sin await
    if (!originalLine.trim().startsWith('await') && originalLine.includes('(')) {
      const newLine = originalLine.replace(/(\s*)(\w+\()/, '$1await $2');

      lines[lineIndex] = newLine;

      return {
        success: true,
        newContent: lines.join('\n'),
        changes: [{
          line: issue.line,
          old: originalLine.trim(),
          new: newLine.trim(),
          description: 'Added missing await keyword'
        }]
      };
    }

    return { success: false, reason: 'Could not identify async call pattern' };
  }

  /**
   * Fix: Missing error handling
   */
  async fixMissingErrorHandling(lines, issue) {
    const lineIndex = issue.line - 1;
    const originalLine = lines[lineIndex];

    // Envolver en try-catch
    const indent = originalLine.match(/^\s*/)[0];

    lines.splice(lineIndex, 0, `${indent}try {`);
    lines[lineIndex + 2] = `${indent}} catch (error) {`;
    lines.splice(lineIndex + 3, 0, `${indent}  console.error('Error:', error);`);
    lines.splice(lineIndex + 4, 0, `${indent}}`);

    return {
      success: true,
      newContent: lines.join('\n'),
      changes: [{
        line: issue.line,
        old: originalLine.trim(),
        new: `try { ${originalLine.trim()} } catch (error) { ... }`,
        description: 'Wrapped code in try-catch block'
      }]
    };
  }

  /**
   * Fix: Unused variable
   */
  async fixUnusedVariable(lines, issue) {
    const lineIndex = issue.line - 1;
    const originalLine = lines[lineIndex];

    // Comentar la variable no usada
    const newLine = `// ${originalLine}`;

    lines[lineIndex] = newLine;

    return {
      success: true,
      newContent: lines.join('\n'),
      changes: [{
        line: issue.line,
        old: originalLine.trim(),
        new: newLine.trim(),
        description: 'Commented out unused variable'
      }]
    };
  }

  /**
   * Fix genérico basado en sugerencia de IA
   */
  async genericFix(lines, issue) {
    const lineIndex = issue.line - 1;
    const originalLine = lines[lineIndex];
    const suggestion = issue.suggestion || issue.fix || issue.solution;

    // Agregar comentario con la sugerencia
    const comment = `// FIX: ${suggestion}`;
    lines.splice(lineIndex, 0, comment);

    return {
      success: true,
      newContent: lines.join('\n'),
      changes: [{
        line: issue.line,
        old: originalLine.trim(),
        new: `${comment}\n${originalLine}`,
        description: `Added fix suggestion: ${suggestion}`
      }]
    };
  }

  /**
   * Aprende de un fix exitoso (Learning System)
   */
  async learnFromFix(filePath, issue, originalContent, fixResult) {
    try {
      const ext = path.extname(filePath);
      const issueType = issue.type || this.determineIssueType(issue);
      const severity = issue.severity || 'medium';

      // Extraer código antes y después del fix
      const lines = originalContent.split('\n');
      const lineIndex = issue.line - 1;
      const codeBefore = lines[lineIndex] || '';
      const codeAfter = fixResult.changes[0]?.new || '';

      // Aprender patrón
      const patternResult = await this.patternDatabase.learnPattern({
        code: codeBefore,
        issueType,
        severity,
        fixStrategy: fixResult.changes[0]?.description || 'Fix applied',
        language: 'javascript',
        fileExtension: ext,
        metadata: {
          filePath,
          line: issue.line,
          changeType: 'fix'
        }
      });

      // Registrar fix exitoso
      await this.patternDatabase.recordSuccessfulFix({
        patternId: patternResult.id,
        filePath,
        issueDescription: issue.description || issue.issue || issue.problem || '',
        fixDescription: fixResult.changes[0]?.description || '',
        codeBefore,
        codeAfter,
        success: true,
        metadata: {
          issueType,
          severity
        }
      });

      console.log(`🧠 [Fix Engine] Patrón ${patternResult.isNew ? 'nuevo' : 'existente'} aprendido (ID: ${patternResult.id})`);

    } catch (error) {
      console.error('❌ [Fix Engine] Error en learning system:', error.message);
    }
  }

  /**
   * Determina tipo de issue
   */
  determineIssueType(issue) {
    const description = (issue.description || issue.issue || issue.problem || '').toLowerCase();

    if (description.includes('eval')) return 'eval-usage';
    if (description.includes('sql')) return 'sql-injection';
    if (description.includes('xss') || description.includes('innerhtml')) return 'xss-vulnerability';
    if (description.includes('loop')) return 'inefficient-loop';
    if (description.includes('null') || description.includes('undefined')) return 'null-reference';
    if (description.includes('await')) return 'missing-await';
    if (description.includes('error') || description.includes('catch')) return 'missing-error-handling';

    return 'generic';
  }

  /**
   * Obtiene estadísticas
   */
  getStats() {
    return { ...this.stats };
  }
}

module.exports = FixEngine;

// core/learning/pattern-matcher.cjs
// Sistema de matching rápido de patrones sin IA

const { EventEmitter } = require('events');
const path = require('path');

class PatternMatcher extends EventEmitter {
  constructor(patternDatabase, options = {}) {
    super();

    this.db = patternDatabase;
    this.enabled = options.enabled !== false;
    this.minConfidence = options.minConfidence || 0.5;

    // Cache de patrones en memoria para matching ultra-rápido
    this.patternCache = new Map();
    this.lastCacheUpdate = 0;
    this.cacheRefreshInterval = 60000; // 1 minuto

    // Stats
    this.stats = {
      totalMatches: 0,
      fastMatches: 0,
      avgMatchTime: 0,
      cacheHits: 0
    };
  }

  /**
   * Inicializa el matcher
   */
  async initialize() {
    console.log('⚡ [Pattern Matcher] Inicializando...');

    if (!this.enabled) {
      console.log('⚠️ [Pattern Matcher] Deshabilitado');
      return;
    }

    await this.refreshCache();

    console.log(`✅ [Pattern Matcher] Listo con ${this.patternCache.size} patrones en cache`);
  }

  /**
   * Refresca el cache de patrones desde la DB
   */
  async refreshCache() {
    const patterns = await this.db.db.all(
      `SELECT * FROM patterns
       WHERE confidence_score >= ?
       ORDER BY confidence_score DESC, times_detected DESC`,
      [this.minConfidence]
    );

    this.patternCache.clear();

    // Validar que patterns sea un array
    if (!patterns || !Array.isArray(patterns)) {
      console.warn('⚠️  [Pattern Matcher] No se pudieron cargar patrones de la DB');
      return;
    }

    patterns.forEach(pattern => {
      const ext = pattern.file_extension || '.js';

      if (!this.patternCache.has(ext)) {
        this.patternCache.set(ext, []);
      }

      this.patternCache.get(ext).push({
        id: pattern.id,
        type: pattern.pattern_type,
        issueType: pattern.issue_type,
        severity: pattern.severity,
        codePattern: pattern.code_pattern,
        fixStrategy: pattern.fix_strategy,
        confidence: pattern.confidence_score,
        timesDetected: pattern.times_detected,
        successRate: pattern.success_rate
      });
    });

    this.lastCacheUpdate = Date.now();

    console.log(`🔄 [Pattern Matcher] Cache actualizado: ${patterns.length} patrones`);
  }

  /**
   * Analiza código rápidamente usando patrones conocidos
   */
  async quickAnalyze(code, filePath) {
    if (!this.enabled) {
      return { matched: false, patterns: [] };
    }

    const startTime = Date.now();

    // Actualizar cache si es necesario
    if (Date.now() - this.lastCacheUpdate > this.cacheRefreshInterval) {
      await this.refreshCache();
    }

    const ext = path.extname(filePath);
    const patterns = this.patternCache.get(ext) || [];

    if (patterns.length === 0) {
      return { matched: false, patterns: [], matchTime: Date.now() - startTime };
    }

    this.stats.cacheHits++;

    // Buscar matches
    const matches = [];

    for (const pattern of patterns) {
      const match = this.matchPattern(code, pattern);

      if (match.matched) {
        matches.push({
          patternId: pattern.id,
          issueType: pattern.issueType,
          severity: pattern.severity,
          confidence: pattern.confidence,
          fixStrategy: pattern.fixStrategy,
          line: match.line,
          description: this.generateDescription(pattern),
          suggestion: this.generateSuggestion(pattern),
          metadata: {
            timesDetected: pattern.timesDetected,
            successRate: pattern.successRate,
            patternBased: true
          }
        });
      }
    }

    const matchTime = Date.now() - startTime;

    this.stats.totalMatches++;
    if (matches.length > 0) {
      this.stats.fastMatches++;
    }

    // Actualizar promedio de tiempo
    this.stats.avgMatchTime =
      (this.stats.avgMatchTime * (this.stats.totalMatches - 1) + matchTime) /
      this.stats.totalMatches;

    if (matches.length > 0) {
      console.log(`⚡ [Pattern Matcher] ${matches.length} matches en ${matchTime}ms (${filePath})`);

      this.emit('patterns:matched', {
        filePath,
        matches,
        matchTime
      });
    }

    return {
      matched: matches.length > 0,
      patterns: matches,
      matchTime
    };
  }

  /**
   * Intenta hacer match de un patrón con el código
   */
  matchPattern(code, pattern) {
    const lines = code.split('\n');

    // Diferentes estrategias de matching según el tipo
    switch (pattern.type) {
      case 'eval-usage':
        return this.matchEvalUsage(lines);

      case 'sql-injection':
        return this.matchSQLInjection(lines);

      case 'xss-vulnerability':
        return this.matchXSSVulnerability(lines);

      case 'nested-loop':
        return this.matchNestedLoop(lines);

      case 'null-reference':
        return this.matchNullReference(lines);

      case 'missing-await':
        return this.matchMissingAwait(lines);

      default:
        return this.matchGeneric(code, pattern.codePattern);
    }
  }

  /**
   * Match: eval() usage
   */
  matchEvalUsage(lines) {
    const evalRegex = /\beval\s*\(/;

    for (let i = 0; i < lines.length; i++) {
      if (evalRegex.test(lines[i])) {
        return { matched: true, line: i + 1 };
      }
    }

    return { matched: false };
  }

  /**
   * Match: SQL Injection
   */
  matchSQLInjection(lines) {
    const sqlRegex = /(SELECT|INSERT|UPDATE|DELETE).*['"`]\s*\+/i;

    for (let i = 0; i < lines.length; i++) {
      if (sqlRegex.test(lines[i])) {
        return { matched: true, line: i + 1 };
      }
    }

    return { matched: false };
  }

  /**
   * Match: XSS vulnerability
   */
  matchXSSVulnerability(lines) {
    const xssRegex = /\.innerHTML\s*=/;

    for (let i = 0; i < lines.length; i++) {
      if (xssRegex.test(lines[i])) {
        return { matched: true, line: i + 1 };
      }
    }

    return { matched: false };
  }

  /**
   * Match: Nested loop (O(n²))
   */
  matchNestedLoop(lines) {
    let openLoops = 0;
    let maxNesting = 0;
    let nestedLine = -1;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      if (/\bfor\s*\(/.test(line) || /\.forEach\(/.test(line) || /\.map\(/.test(line)) {
        openLoops++;
        if (openLoops > maxNesting) {
          maxNesting = openLoops;
          nestedLine = i + 1;
        }
      }

      if (line.includes('}')) {
        openLoops = Math.max(0, openLoops - 1);
      }
    }

    if (maxNesting >= 2) {
      return { matched: true, line: nestedLine };
    }

    return { matched: false };
  }

  /**
   * Match: Null reference
   */
  matchNullReference(lines) {
    const nullRefRegex = /\w+\.\w+/;
    const safeRegex = /\?\.|\&\&/;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      if (nullRefRegex.test(line) && !safeRegex.test(line)) {
        // Evitar false positives (console.log, etc)
        if (!line.includes('console.') && !line.includes('Math.')) {
          return { matched: true, line: i + 1 };
        }
      }
    }

    return { matched: false };
  }

  /**
   * Match: Missing await
   */
  matchMissingAwait(lines) {
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      // Buscar llamadas a funciones async sin await
      if (
        /\basync\s+function/.test(line) ||
        /\basync\s*\(/.test(line) ||
        /\basync\s+\w+/.test(line)
      ) {
        // Verificar si hay await en líneas siguientes
        let hasAwait = false;
        for (let j = i; j < Math.min(i + 5, lines.length); j++) {
          if (/\bawait\b/.test(lines[j])) {
            hasAwait = true;
            break;
          }
        }

        if (!hasAwait && /\(.*\)/.test(line)) {
          return { matched: true, line: i + 1 };
        }
      }
    }

    return { matched: false };
  }

  /**
   * Match genérico por similitud
   */
  matchGeneric(code, pattern) {
    const similarity = this.calculateSimilarity(
      this.normalizeCode(code),
      this.normalizeCode(pattern)
    );

    if (similarity > 0.7) {
      return { matched: true, line: 1 };
    }

    return { matched: false };
  }

  /**
   * Normaliza código para comparación
   */
  normalizeCode(code) {
    return code
      .replace(/\/\/.*/g, '')
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  /**
   * Calcula similitud (mismo que PatternDatabase)
   */
  calculateSimilarity(str1, str2) {
    const longer = str1.length > str2.length ? str1 : str2;
    const shorter = str1.length > str2.length ? str2 : str1;

    if (longer.length === 0) return 1.0;

    const editDistance = this.levenshteinDistance(longer, shorter);
    return (longer.length - editDistance) / longer.length;
  }

  levenshteinDistance(str1, str2) {
    const matrix = [];

    for (let i = 0; i <= str2.length; i++) {
      matrix[i] = [i];
    }

    for (let j = 0; j <= str1.length; j++) {
      matrix[0][j] = j;
    }

    for (let i = 1; i <= str2.length; i++) {
      for (let j = 1; j <= str1.length; j++) {
        if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          );
        }
      }
    }

    return matrix[str2.length][str1.length];
  }

  /**
   * Genera descripción del issue basado en el patrón
   */
  generateDescription(pattern) {
    const descriptions = {
      'eval-usage': 'Security: eval() usage detected - potential code injection',
      'sql-injection': 'Security: SQL injection vulnerability - string concatenation in query',
      'xss-vulnerability': 'Security: XSS vulnerability - innerHTML usage',
      'nested-loop': 'Performance: Nested loop detected - O(n²) complexity',
      'null-reference': 'Bug: Potential null reference - missing null check',
      'missing-await': 'Bug: Async function call without await'
    };

    return descriptions[pattern.issueType] || `Issue detected: ${pattern.issueType}`;
  }

  /**
   * Genera sugerencia de fix basado en el patrón
   */
  generateSuggestion(pattern) {
    const suggestions = {
      'eval-usage': 'Replace eval() with JSON.parse() or safer alternative',
      'sql-injection': 'Use parameterized queries instead of string concatenation',
      'xss-vulnerability': 'Replace innerHTML with textContent or use sanitization',
      'nested-loop': 'Consider using Map/Set for O(1) lookups',
      'null-reference': 'Add optional chaining (?.) or null check',
      'missing-await': 'Add await keyword before async function call'
    };

    return suggestions[pattern.issueType] || pattern.fixStrategy;
  }

  /**
   * Obtiene estadísticas
   */
  getStats() {
    return {
      ...this.stats,
      cachedPatterns: this.patternCache.size,
      matchRate: this.stats.totalMatches > 0
        ? (this.stats.fastMatches / this.stats.totalMatches) * 100
        : 0
    };
  }
}

module.exports = PatternMatcher;

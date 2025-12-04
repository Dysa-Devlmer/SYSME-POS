// core/learning/pattern-database.cjs
// Base de datos de patrones aprendidos para detección rápida

const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs-extra');
const { EventEmitter } = require('events');

class PatternDatabase extends EventEmitter {
  constructor(options = {}) {
    super();

    this.dbPath = options.dbPath || path.join(process.cwd(), 'memory', 'patterns.db');
    this.db = null;

    // Stats
    this.stats = {
      totalPatterns: 0,
      successfulMatches: 0,
      failedMatches: 0,
      learningRate: 0
    };
  }

  /**
   * Inicializa la base de datos
   */
  async initialize() {
    console.log('🧠 [Pattern DB] Inicializando base de datos de patrones...');

    // Asegurar que existe el directorio
    await fs.ensureDir(path.dirname(this.dbPath));

    return new Promise((resolve, reject) => {
      this.db = new sqlite3.Database(this.dbPath, (err) => {
        if (err) {
          console.error('❌ [Pattern DB] Error abriendo base de datos:', err.message);
          return reject(err);
        }

        console.log(`✅ [Pattern DB] Base de datos abierta: ${this.dbPath}`);
        this.createTables().then(resolve).catch(reject);
      });
    });
  }

  /**
   * Crea las tablas necesarias
   */
  async createTables() {
    return new Promise((resolve, reject) => {
      this.db.serialize(() => {
        // Tabla de patrones
        this.db.run(`
          CREATE TABLE IF NOT EXISTS patterns (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            pattern_hash TEXT UNIQUE NOT NULL,
            pattern_type TEXT NOT NULL,
            issue_type TEXT NOT NULL,
            severity TEXT NOT NULL,
            code_pattern TEXT NOT NULL,
            fix_strategy TEXT NOT NULL,
            confidence_score REAL DEFAULT 0.5,
            times_detected INTEGER DEFAULT 1,
            times_fixed INTEGER DEFAULT 0,
            success_rate REAL DEFAULT 0.0,
            language TEXT,
            file_extension TEXT,
            created_at INTEGER NOT NULL,
            last_seen INTEGER NOT NULL,
            metadata TEXT
          )
        `);

        // Tabla de detecciones (para analytics)
        this.db.run(`
          CREATE TABLE IF NOT EXISTS detections (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            pattern_id INTEGER NOT NULL,
            file_path TEXT NOT NULL,
            line_number INTEGER NOT NULL,
            detected_at INTEGER NOT NULL,
            fixed BOOLEAN DEFAULT 0,
            fix_successful BOOLEAN DEFAULT NULL,
            FOREIGN KEY (pattern_id) REFERENCES patterns(id)
          )
        `);

        // Tabla de fixes aplicados (learning)
        this.db.run(`
          CREATE TABLE IF NOT EXISTS fixes_applied (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            pattern_id INTEGER,
            file_path TEXT NOT NULL,
            issue_description TEXT NOT NULL,
            fix_description TEXT NOT NULL,
            code_before TEXT NOT NULL,
            code_after TEXT NOT NULL,
            success BOOLEAN NOT NULL,
            applied_at INTEGER NOT NULL,
            metadata TEXT,
            FOREIGN KEY (pattern_id) REFERENCES patterns(id)
          )
        `);

        // Índices para búsqueda rápida
        this.db.run('CREATE INDEX IF NOT EXISTS idx_pattern_hash ON patterns(pattern_hash)');
        this.db.run('CREATE INDEX IF NOT EXISTS idx_issue_type ON patterns(issue_type)');
        this.db.run('CREATE INDEX IF NOT EXISTS idx_pattern_type ON patterns(pattern_type)');
        this.db.run('CREATE INDEX IF NOT EXISTS idx_file_extension ON patterns(file_extension)');

        console.log('✅ [Pattern DB] Tablas creadas/verificadas');

        this.loadStats().then(resolve).catch(reject);
      });
    });
  }

  /**
   * Carga estadísticas
   */
  async loadStats() {
    return new Promise((resolve) => {
      this.db.get('SELECT COUNT(*) as count FROM patterns', (err, row) => {
        if (!err && row) {
          this.stats.totalPatterns = row.count;
        }
        console.log(`📊 [Pattern DB] ${this.stats.totalPatterns} patrones en memoria`);
        resolve();
      });
    });
  }

  /**
   * Aprende un nuevo patrón desde un issue detectado
   */
  async learnPattern(issueData) {
    const {
      code,
      issueType,
      severity,
      fixStrategy,
      language,
      fileExtension,
      metadata = {}
    } = issueData;

    // Generar hash del patrón
    const patternHash = this.generatePatternHash(code, issueType);

    const timestamp = Date.now();

    return new Promise((resolve, reject) => {
      // Verificar si el patrón ya existe
      this.db.get(
        'SELECT id, times_detected, times_fixed FROM patterns WHERE pattern_hash = ?',
        [patternHash],
        (err, existing) => {
          if (err) {
            console.error('❌ [Pattern DB] Error verificando patrón:', err.message);
            return reject(err);
          }

          if (existing) {
            // Patrón existente - incrementar contador
            this.db.run(
              `UPDATE patterns
               SET times_detected = times_detected + 1,
                   last_seen = ?,
                   confidence_score = MIN(confidence_score + 0.05, 1.0)
               WHERE id = ?`,
              [timestamp, existing.id],
              (err) => {
                if (err) {
                  console.error('❌ [Pattern DB] Error actualizando patrón:', err.message);
                  return reject(err);
                }

                console.log(`🔄 [Pattern DB] Patrón existente actualizado: ${issueType}`);
                resolve({ id: existing.id, isNew: false });
              }
            );
          } else {
            // Nuevo patrón - insertar
            this.db.run(
              `INSERT INTO patterns (
                pattern_hash, pattern_type, issue_type, severity,
                code_pattern, fix_strategy, language, file_extension,
                created_at, last_seen, metadata
              ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
              [
                patternHash,
                this.detectPatternType(code),
                issueType,
                severity,
                code,
                fixStrategy,
                language || 'javascript',
                fileExtension || '.js',
                timestamp,
                timestamp,
                JSON.stringify(metadata)
              ],
              function(err) {
                if (err) {
                  console.error('❌ [Pattern DB] Error insertando patrón:', err.message);
                  return reject(err);
                }

                console.log(`✅ [Pattern DB] Nuevo patrón aprendido: ${issueType} (ID: ${this.lastID})`);
                resolve({ id: this.lastID, isNew: true });
              }
            );
          }
        }
      );
    });
  }

  /**
   * Registra un fix aplicado exitosamente (para learning)
   */
  async recordSuccessfulFix(fixData) {
    const {
      patternId,
      filePath,
      issueDescription,
      fixDescription,
      codeBefore,
      codeAfter,
      success,
      metadata = {}
    } = fixData;

    const timestamp = Date.now();

    return new Promise((resolve, reject) => {
      // Insertar registro de fix
      this.db.run(
        `INSERT INTO fixes_applied (
          pattern_id, file_path, issue_description, fix_description,
          code_before, code_after, success, applied_at, metadata
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          patternId,
          filePath,
          issueDescription,
          fixDescription,
          codeBefore,
          codeAfter,
          success ? 1 : 0,
          timestamp,
          JSON.stringify(metadata)
        ],
        (err) => {
          if (err) {
            console.error('❌ [Pattern DB] Error registrando fix:', err.message);
            return reject(err);
          }

          // Si tiene patternId, actualizar estadísticas del patrón
          if (patternId && success) {
            this.db.run(
              `UPDATE patterns
               SET times_fixed = times_fixed + 1,
                   success_rate = CAST(times_fixed AS REAL) / CAST(times_detected AS REAL),
                   confidence_score = MIN(confidence_score + 0.1, 1.0)
               WHERE id = ?`,
              [patternId],
              (err) => {
                if (err) {
                  console.error('❌ [Pattern DB] Error actualizando stats de patrón:', err.message);
                }
              }
            );
          }

          console.log(`✅ [Pattern DB] Fix registrado: ${issueDescription.substring(0, 50)}...`);
          resolve();
        }
      );
    });
  }

  /**
   * Busca patrones similares para detección rápida
   */
  async findSimilarPatterns(code, fileExtension, limit = 5) {
    return new Promise((resolve, reject) => {
      this.db.all(
        `SELECT * FROM patterns
         WHERE file_extension = ?
         AND confidence_score > 0.3
         ORDER BY confidence_score DESC, times_detected DESC
         LIMIT ?`,
        [fileExtension, limit],
        (err, rows) => {
          if (err) {
            console.error('❌ [Pattern DB] Error buscando patrones:', err.message);
            return reject(err);
          }

          // Filtrar por similitud de código
          const similar = rows.filter(pattern =>
            this.calculateSimilarity(code, pattern.code_pattern) > 0.6
          );

          resolve(similar);
        }
      );
    });
  }

  /**
   * Obtiene estadísticas de aprendizaje
   */
  async getAnalytics() {
    return new Promise((resolve, reject) => {
      const analytics = {};

      this.db.serialize(() => {
        // Patrones por tipo
        this.db.all(
          `SELECT issue_type, COUNT(*) as count, AVG(confidence_score) as avg_confidence
           FROM patterns
           GROUP BY issue_type
           ORDER BY count DESC`,
          (err, rows) => {
            if (!err) analytics.byIssueType = rows;
          }
        );

        // Patrones más detectados
        this.db.all(
          `SELECT issue_type, code_pattern, times_detected, times_fixed, success_rate, confidence_score
           FROM patterns
           ORDER BY times_detected DESC
           LIMIT 10`,
          (err, rows) => {
            if (!err) analytics.topPatterns = rows;
          }
        );

        // Fixes exitosos vs fallidos
        this.db.get(
          `SELECT
             COUNT(*) as total_fixes,
             SUM(CASE WHEN success = 1 THEN 1 ELSE 0 END) as successful_fixes,
             AVG(CASE WHEN success = 1 THEN 1.0 ELSE 0.0 END) * 100 as success_percentage
           FROM fixes_applied`,
          (err, row) => {
            if (!err) analytics.fixesStats = row;
          }
        );

        // Estadísticas generales
        this.db.get(
          'SELECT COUNT(*) as total_patterns FROM patterns',
          (err, row) => {
            if (!err) analytics.totalPatterns = row.total_patterns;

            resolve(analytics);
          }
        );
      });
    });
  }

  /**
   * Genera hash único para un patrón
   */
  generatePatternHash(code, issueType) {
    const crypto = require('crypto');

    // Normalizar código (remover whitespace extra, comentarios)
    const normalized = code
      .replace(/\/\/.*/g, '')
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/\s+/g, ' ')
      .trim();

    return crypto
      .createHash('sha256')
      .update(`${normalized}:${issueType}`)
      .digest('hex')
      .substring(0, 16);
  }

  /**
   * Detecta el tipo de patrón basado en el código
   */
  detectPatternType(code) {
    if (code.includes('eval(')) return 'eval-usage';
    if (code.includes('SELECT') && code.includes('+')) return 'sql-injection';
    if (code.includes('innerHTML')) return 'xss-vulnerability';
    if (code.includes('for') && code.includes('for')) return 'nested-loop';
    if (code.includes('.') && !code.includes('?.')) return 'null-reference';
    if (code.includes('async') && !code.includes('await')) return 'missing-await';

    return 'generic';
  }

  /**
   * Calcula similitud entre dos strings de código
   */
  calculateSimilarity(str1, str2) {
    // Simple Levenshtein-based similarity
    const longer = str1.length > str2.length ? str1 : str2;
    const shorter = str1.length > str2.length ? str2 : str1;

    if (longer.length === 0) return 1.0;

    const editDistance = this.levenshteinDistance(longer, shorter);
    return (longer.length - editDistance) / longer.length;
  }

  /**
   * Levenshtein distance
   */
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
   * Obtiene estadísticas actuales
   */
  getStats() {
    return { ...this.stats };
  }

  /**
   * Cierra la base de datos
   */
  async close() {
    return new Promise((resolve) => {
      if (this.db) {
        this.db.close((err) => {
          if (err) {
            console.error('❌ [Pattern DB] Error cerrando base de datos:', err.message);
          } else {
            console.log('✅ [Pattern DB] Base de datos cerrada');
          }
          resolve();
        });
      } else {
        resolve();
      }
    });
  }
}

module.exports = PatternDatabase;

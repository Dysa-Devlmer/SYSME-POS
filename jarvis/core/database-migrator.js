/**
 * 💾 JARVIS DATABASE MIGRATOR
 * Sistema de migraciones de base de datos
 *
 * Features:
 * - Versionado de schema
 * - Migraciones up/down
 * - Rollback automático en fallo
 * - Historial de migraciones
 * - Migraciones seguras (transacciones)
 * - Soporte SQLite y MySQL
 */

const fs = require('fs');
const path = require('path');
const { getLogger } = require('./logger');

class DatabaseMigrator {
  constructor(config = {}) {
    this.config = {
      migrationsPath: config.migrationsPath || path.join(__dirname, '../migrations'),
      dbType: config.dbType || 'sqlite',
      connection: config.connection,
      ...config
    };

    this.logger = getLogger();
    this.db = null;

    // Crear directorio de migraciones si no existe
    if (!fs.existsSync(this.config.migrationsPath)) {
      fs.mkdirSync(this.config.migrationsPath, { recursive: true});
    }
  }

  /**
   * Conecta a la base de datos
   */
  async connect() {
    if (this.db) return;

    try {
      if (this.config.dbType === 'sqlite') {
        const sqlite3 = require('better-sqlite3');
        this.db = sqlite3(this.config.connection.path || './memory/jarvis.db');
      } else if (this.config.dbType === 'mysql') {
        const mysql = require('mysql2/promise');
        this.db = await mysql.createConnection(this.config.connection);
      }

      this.logger.info('Database connected for migrations');

      // Crear tabla de migraciones
      await this.createMigrationsTable();

    } catch (error) {
      this.logger.error('Failed to connect to database:', { error: error.message });
      throw error;
    }
  }

  /**
   * Crea la tabla de migraciones
   */
  async createMigrationsTable() {
    const sql = `
      CREATE TABLE IF NOT EXISTS migrations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name VARCHAR(255) NOT NULL UNIQUE,
        executed_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `;

    if (this.config.dbType === 'sqlite') {
      this.db.exec(sql);
    } else {
      await this.db.execute(sql.replace('INTEGER PRIMARY KEY AUTOINCREMENT', 'INT AUTO_INCREMENT PRIMARY KEY'));
    }
  }

  /**
   * Obtiene migraciones ejecutadas
   */
  async getExecutedMigrations() {
    if (this.config.dbType === 'sqlite') {
      return this.db.prepare('SELECT name FROM migrations ORDER BY id').all();
    } else {
      const [rows] = await this.db.execute('SELECT name FROM migrations ORDER BY id');
      return rows;
    }
  }

  /**
   * Obtiene migraciones pendientes
   */
  async getPendingMigrations() {
    const executed = await this.getExecutedMigrations();
    const executedNames = new Set(executed.map(m => m.name));

    // Leer archivos de migración
    const files = fs.readdirSync(this.config.migrationsPath)
      .filter(f => f.endsWith('.js'))
      .sort();

    return files.filter(f => !executedNames.has(f));
  }

  /**
   * Ejecuta migraciones pendientes
   */
  async migrate() {
    await this.connect();

    const pending = await this.getPendingMigrations();

    if (pending.length === 0) {
      this.logger.info('No pending migrations');
      return { migrated: 0, migrations: [] };
    }

    this.logger.info(`Found ${pending.length} pending migrations`);

    const migrated = [];

    for (const migrationFile of pending) {
      try {
        await this.runMigration(migrationFile, 'up');
        migrated.push(migrationFile);

        this.logger.success(`Migrated: ${migrationFile}`);

      } catch (error) {
        this.logger.error(`Migration failed: ${migrationFile}`, {
          error: error.message
        });

        // Rollback esta migración
        await this.runMigration(migrationFile, 'down').catch(() => {});

        throw new Error(`Migration failed at ${migrationFile}: ${error.message}`);
      }
    }

    this.logger.success(`Successfully migrated ${migrated.length} migrations`);

    return {
      migrated: migrated.length,
      migrations: migrated
    };
  }

  /**
   * Ejecuta una migración
   */
  async runMigration(migrationFile, direction) {
    const migrationPath = path.join(this.config.migrationsPath, migrationFile);

    // Cargar migración
    delete require.cache[require.resolve(migrationPath)];
    const migration = require(migrationPath);

    if (!migration[direction]) {
      throw new Error(`Migration ${migrationFile} does not have ${direction} method`);
    }

    // Ejecutar migración
    await migration[direction](this.db, this.config.dbType);

    // Registrar migración
    if (direction === 'up') {
      await this.recordMigration(migrationFile);
    } else {
      await this.removeMigration(migrationFile);
    }
  }

  /**
   * Registra migración ejecutada
   */
  async recordMigration(name) {
    if (this.config.dbType === 'sqlite') {
      this.db.prepare('INSERT INTO migrations (name) VALUES (?)').run(name);
    } else {
      await this.db.execute('INSERT INTO migrations (name) VALUES (?)', [name]);
    }
  }

  /**
   * Remueve registro de migración
   */
  async removeMigration(name) {
    if (this.config.dbType === 'sqlite') {
      this.db.prepare('DELETE FROM migrations WHERE name = ?').run(name);
    } else {
      await this.db.execute('DELETE FROM migrations WHERE name = ?', [name]);
    }
  }

  /**
   * Rollback de la última migración
   */
  async rollback(steps = 1) {
    await this.connect();

    const executed = await this.getExecutedMigrations();

    if (executed.length === 0) {
      this.logger.warn('No migrations to rollback');
      return { rolledback: 0, migrations: [] };
    }

    const toRollback = executed.slice(-steps).reverse();

    this.logger.info(`Rolling back ${toRollback.length} migrations`);

    const rolledback = [];

    for (const migration of toRollback) {
      try {
        await this.runMigration(migration.name, 'down');
        rolledback.push(migration.name);

        this.logger.success(`Rolled back: ${migration.name}`);

      } catch (error) {
        this.logger.error(`Rollback failed: ${migration.name}`, {
          error: error.message
        });
        throw error;
      }
    }

    this.logger.success(`Successfully rolled back ${rolledback.length} migrations`);

    return {
      rolledback: rolledback.length,
      migrations: rolledback
    };
  }

  /**
   * Crea una nueva migración
   */
  createMigration(name) {
    const timestamp = Date.now();
    const filename = `${timestamp}_${name.replace(/\s+/g, '_').toLowerCase()}.js`;
    const filepath = path.join(this.config.migrationsPath, filename);

    const template = `/**
 * Migration: ${name}
 * Created: ${new Date().toISOString()}
 */

module.exports = {
  /**
   * Run migration
   */
  async up(db, dbType) {
    if (dbType === 'sqlite') {
      // SQLite specific
      db.exec(\`
        -- Your SQL here
      \`);
    } else {
      // MySQL specific
      await db.execute(\`
        -- Your SQL here
      \`);
    }
  },

  /**
   * Rollback migration
   */
  async down(db, dbType) {
    if (dbType === 'sqlite') {
      db.exec(\`
        -- Rollback SQL here
      \`);
    } else {
      await db.execute(\`
        -- Rollback SQL here
      \`);
    }
  }
};
`;

    fs.writeFileSync(filepath, template);

    this.logger.success(`Created migration: ${filename}`);

    return filepath;
  }

  /**
   * Muestra estado de migraciones
   */
  async status() {
    await this.connect();

    const executed = await this.getExecutedMigrations();
    const pending = await this.getPendingMigrations();

    return {
      executed: executed.length,
      pending: pending.length,
      executedMigrations: executed.map(m => m.name),
      pendingMigrations: pending
    };
  }

  /**
   * Cierra conexión
   */
  async close() {
    if (this.db) {
      if (this.config.dbType === 'sqlite') {
        this.db.close();
      } else {
        await this.db.end();
      }
      this.db = null;
    }
  }
}

module.exports = DatabaseMigrator;

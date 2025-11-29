// =====================================================
// SYSME POS - Database Configuration
// =====================================================
// Centralized database connection and query utilities
//
// @author JARVIS AI Assistant
// @date 2025-11-20
// =====================================================

const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');
const logger = require('./logger');

class DatabaseManager {
  constructor() {
    this.db = null;
    this.isConnected = false;
  }

  /**
   * Initialize database connection
   */
  connect() {
    try {
      const dbPath = process.env.DATABASE_URL?.replace('sqlite:///', '') ||
                     path.join(__dirname, '../data/database.db');

      // Ensure data directory exists
      const dataDir = path.dirname(dbPath);
      if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
        logger.info(`Created data directory: ${dataDir}`);
      }

      // Connect to database
      this.db = new Database(dbPath, {
        verbose: process.env.LOG_SQL_QUERIES === 'true' ? logger.debug : null
      });

      // Configure pragmas for better performance and safety
      this.db.pragma('journal_mode = WAL'); // Write-Ahead Logging
      this.db.pragma('synchronous = NORMAL');
      this.db.pragma('foreign_keys = ON'); // Enable foreign keys
      this.db.pragma('busy_timeout = 5000');

      this.isConnected = true;
      logger.info(`Database connected: ${dbPath}`);

      // Run health check
      this.healthCheck();

      return this.db;
    } catch (error) {
      logger.error('Database connection failed:', error);
      throw error;
    }
  }

  /**
   * Health check - verify database is accessible
   */
  healthCheck() {
    try {
      const result = this.db.prepare('SELECT 1 as health').get();
      if (result.health === 1) {
        logger.debug('Database health check: OK');
        return true;
      }
      return false;
    } catch (error) {
      logger.error('Database health check failed:', error);
      return false;
    }
  }

  /**
   * Get database instance
   */
  getDb() {
    if (!this.isConnected) {
      this.connect();
    }
    return this.db;
  }

  /**
   * Execute a query with error handling
   */
  query(sql, params = []) {
    try {
      const stmt = this.db.prepare(sql);
      return stmt.all(params);
    } catch (error) {
      logger.error(`Query failed: ${sql}`, error);
      throw error;
    }
  }

  /**
   * Execute a query and get single result
   */
  queryOne(sql, params = []) {
    try {
      const stmt = this.db.prepare(sql);
      return stmt.get(params);
    } catch (error) {
      logger.error(`QueryOne failed: ${sql}`, error);
      throw error;
    }
  }

  /**
   * Execute an insert/update/delete
   */
  execute(sql, params = []) {
    try {
      const stmt = this.db.prepare(sql);
      return stmt.run(params);
    } catch (error) {
      logger.error(`Execute failed: ${sql}`, error);
      throw error;
    }
  }

  /**
   * Begin transaction
   */
  beginTransaction() {
    return this.db.prepare('BEGIN TRANSACTION').run();
  }

  /**
   * Commit transaction
   */
  commit() {
    return this.db.prepare('COMMIT').run();
  }

  /**
   * Rollback transaction
   */
  rollback() {
    return this.db.prepare('ROLLBACK').run();
  }

  /**
   * Execute within a transaction
   */
  transaction(callback) {
    try {
      this.beginTransaction();
      const result = callback(this.db);
      this.commit();
      return result;
    } catch (error) {
      this.rollback();
      logger.error('Transaction failed and rolled back:', error);
      throw error;
    }
  }

  /**
   * Run migrations
   */
  async runMigrations() {
    const migrationsDir = path.join(__dirname, '../migrations');

    if (!fs.existsSync(migrationsDir)) {
      logger.warn('Migrations directory not found');
      return;
    }

    // Create migrations tracking table
    this.db.prepare(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        migration_name TEXT NOT NULL UNIQUE,
        executed_at TEXT DEFAULT CURRENT_TIMESTAMP
      )
    `).run();

    // Get all migration files
    const files = fs.readdirSync(migrationsDir)
      .filter(f => f.endsWith('.sql'))
      .sort();

    logger.info(`Found ${files.length} migration files`);

    for (const file of files) {
      // Check if already executed
      const existing = this.db.prepare(
        'SELECT * FROM schema_migrations WHERE migration_name = ?'
      ).get(file);

      if (existing) {
        logger.debug(`Migration already executed: ${file}`);
        continue;
      }

      try {
        logger.info(`Running migration: ${file}`);

        // Read and execute migration
        const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8');

        // Split by semicolons and execute each statement
        const statements = sql
          .split(';')
          .map(s => s.trim())
          .filter(s => s.length > 0 && !s.startsWith('--'));

        this.transaction(() => {
          for (const statement of statements) {
            this.db.prepare(statement).run();
          }

          // Record migration
          this.db.prepare(
            'INSERT INTO schema_migrations (migration_name) VALUES (?)'
          ).run(file);
        });

        logger.info(`Migration completed: ${file}`);
      } catch (error) {
        logger.error(`Migration failed: ${file}`, error);
        throw error;
      }
    }

    logger.info('All migrations completed successfully');
  }

  /**
   * Get database statistics
   */
  getStats() {
    try {
      const stats = {
        size: 0,
        tables: [],
        totalRecords: 0
      };

      // Get database size
      const dbPath = this.db.name;
      if (fs.existsSync(dbPath)) {
        const fileStat = fs.statSync(dbPath);
        stats.size = fileStat.size;
      }

      // Get all tables
      const tables = this.db.prepare(`
        SELECT name FROM sqlite_master
        WHERE type='table' AND name NOT LIKE 'sqlite_%'
        ORDER BY name
      `).all();

      // Get record count for each table
      for (const table of tables) {
        const count = this.db.prepare(`SELECT COUNT(*) as count FROM ${table.name}`).get();
        stats.tables.push({
          name: table.name,
          records: count.count
        });
        stats.totalRecords += count.count;
      }

      return stats;
    } catch (error) {
      logger.error('Failed to get database stats:', error);
      return null;
    }
  }

  /**
   * Backup database
   */
  async backup(backupPath) {
    try {
      if (!backupPath) {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        backupPath = path.join(__dirname, `../backups/backup-${timestamp}.db`);
      }

      // Ensure backup directory exists
      const backupDir = path.dirname(backupPath);
      if (!fs.existsSync(backupDir)) {
        fs.mkdirSync(backupDir, { recursive: true });
      }

      // Use SQLite backup API
      await this.db.backup(backupPath);

      logger.info(`Database backed up to: ${backupPath}`);
      return backupPath;
    } catch (error) {
      logger.error('Backup failed:', error);
      throw error;
    }
  }

  /**
   * Restore database from backup
   */
  async restore(backupPath) {
    try {
      if (!fs.existsSync(backupPath)) {
        throw new Error(`Backup file not found: ${backupPath}`);
      }

      // Close current connection
      this.close();

      // Copy backup to current database
      const dbPath = process.env.DATABASE_URL?.replace('sqlite:///', '') ||
                     path.join(__dirname, '../data/database.db');

      fs.copyFileSync(backupPath, dbPath);

      // Reconnect
      this.connect();

      logger.info(`Database restored from: ${backupPath}`);
      return true;
    } catch (error) {
      logger.error('Restore failed:', error);
      throw error;
    }
  }

  /**
   * Vacuum database (optimize and reclaim space)
   */
  vacuum() {
    try {
      this.db.prepare('VACUUM').run();
      logger.info('Database vacuumed successfully');
      return true;
    } catch (error) {
      logger.error('Vacuum failed:', error);
      return false;
    }
  }

  /**
   * Close database connection
   */
  close() {
    if (this.db) {
      this.db.close();
      this.isConnected = false;
      logger.info('Database connection closed');
    }
  }
}

// Create singleton instance
const dbManager = new DatabaseManager();

// Export both the manager and the db instance getter
module.exports = {
  dbManager,
  getDb: () => dbManager.getDb(),
  query: (sql, params) => dbManager.query(sql, params),
  queryOne: (sql, params) => dbManager.queryOne(sql, params),
  execute: (sql, params) => dbManager.execute(sql, params),
  transaction: (callback) => dbManager.transaction(callback),
  runMigrations: () => dbManager.runMigrations(),
  backup: (path) => dbManager.backup(path),
  restore: (path) => dbManager.restore(path),
  getStats: () => dbManager.getStats(),
  healthCheck: () => dbManager.healthCheck()
};

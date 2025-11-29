/**
 * Run SQL Migration File
 * Executes a SQL migration file on the database
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { connectDatabase, closeDatabase } from '../config/database.js';
import { logger } from '../config/logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const runMigration = async (migrationFile) => {
  let db = null;

  try {
    logger.info(`🔄 Running migration: ${migrationFile}`);

    db = await connectDatabase();

    // Read migration file
    const migrationPath = path.join(__dirname, '../database/migrations', migrationFile);

    if (!fs.existsSync(migrationPath)) {
      throw new Error(`Migration file not found: ${migrationPath}`);
    }

    const sql = fs.readFileSync(migrationPath, 'utf8');

    logger.info(`📋 Executing SQL migration...`);

    try {
      // Use the exec method which handles multiple statements including triggers
      const dbInstance = await db.client.acquireConnection();
      await new Promise((resolve, reject) => {
        dbInstance.exec(sql, (err) => {
          if (err) reject(err);
          else resolve();
        });
      });
      await db.client.releaseConnection(dbInstance);

      logger.info('✅ Migration completed successfully');
    } catch (error) {
      // Log but continue for CREATE IF NOT EXISTS statements
      if (error.message.includes('already exists') || error.message.includes('duplicate')) {
        logger.warn(`⚠️ Migration partially applied (some objects already exist): ${error.message}`);
      } else {
        logger.error(`❌ Error executing migration:`, error.message);
        throw error;
      }
    }

  } catch (error) {
    logger.error('❌ Migration failed:', error);
    throw error;
  } finally {
    if (db) {
      await closeDatabase();
    }
  }
};

// Get migration file from command line argument
const migrationFile = process.argv[2];

if (!migrationFile) {
  console.error('Usage: node run-migration.js <migration-file>');
  console.error('Example: node run-migration.js 014_add_reservations_system.sql');
  process.exit(1);
}

// Run migration
runMigration(migrationFile)
  .then(() => {
    logger.info('✅ All done!');
    process.exit(0);
  })
  .catch((error) => {
    logger.error('❌ Failed:', error);
    process.exit(1);
  });

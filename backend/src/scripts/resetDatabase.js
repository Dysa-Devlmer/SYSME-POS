/**
 * Database Reset Script
 * Reset and recreate database with new schema
 */

import { connectDatabase, closeDatabase } from '../config/database.js';
import { logger } from '../config/logger.js';

const resetDatabase = async () => {
  let db = null;

  try {
    logger.info('🔄 Starting database reset...');

    db = await connectDatabase();

    // Drop all tables if they exist
    const tables = ['sale_items', 'sales', 'tables', 'products', 'tarifas', 'salons', 'categories', 'settings', 'users'];

    for (const table of tables) {
      try {
        await db.schema.dropTableIfExists(table);
        logger.info(`✅ Dropped table: ${table}`);
      } catch (error) {
        logger.warn(`⚠️ Could not drop table ${table}:`, error.message);
      }
    }

    logger.info('🏗️ Database reset complete. Tables will be recreated on next server start.');

  } catch (error) {
    logger.error('❌ Database reset failed:', error);
    throw error;
  } finally {
    if (db) {
      await closeDatabase();
    }
  }
};

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  resetDatabase()
    .then(() => {
      logger.info('✅ Database reset completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      logger.error('❌ Database reset failed:', error);
      process.exit(1);
    });
}

export default resetDatabase;
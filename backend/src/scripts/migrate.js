/**
 * Database Migration Script
 * Add missing columns for POS functionality
 */

import { connectDatabase, closeDatabase } from '../config/database.js';
import { logger } from '../config/logger.js';

const migrate = async () => {
  let db = null;

  try {
    logger.info('🔄 Starting database migration...');

    db = await connectDatabase();

    // Add missing columns to users table for POS functionality
    try {
      await db.raw('ALTER TABLE users ADD COLUMN pin_code varchar(255) DEFAULT NULL');
      logger.info('✅ Added pin_code column');
    } catch (error) {
      if (error.message.includes('duplicate column name')) {
        logger.info('⚠️ pin_code column already exists');
      } else {
        throw error;
      }
    }

    try {
      await db.raw('ALTER TABLE users ADD COLUMN assigned_tpv varchar(20) DEFAULT "TPV1"');
      logger.info('✅ Added assigned_tpv column');
    } catch (error) {
      if (error.message.includes('duplicate column name')) {
        logger.info('⚠️ assigned_tpv column already exists');
      } else {
        throw error;
      }
    }

    try {
      await db.raw('ALTER TABLE users ADD COLUMN assigned_almacen varchar(50) DEFAULT "Local"');
      logger.info('✅ Added assigned_almacen column');
    } catch (error) {
      if (error.message.includes('duplicate column name')) {
        logger.info('⚠️ assigned_almacen column already exists');
      } else {
        throw error;
      }
    }

    try {
      await db.raw('ALTER TABLE users ADD COLUMN permissions text DEFAULT "{}"');
      logger.info('✅ Added permissions column');
    } catch (error) {
      if (error.message.includes('duplicate column name')) {
        logger.info('⚠️ permissions column already exists');
      } else {
        throw error;
      }
    }

    try {
      await db.raw('ALTER TABLE users ADD COLUMN active boolean DEFAULT 1');
      logger.info('✅ Added active column');
    } catch (error) {
      if (error.message.includes('duplicate column name')) {
        logger.info('⚠️ active column already exists');
      } else {
        throw error;
      }
    }

    // Create missing tables if they don't exist
    const tableExists = async (tableName) => {
      const result = await db.raw(`SELECT name FROM sqlite_master WHERE type='table' AND name='${tableName}'`);
      return result.length > 0;
    };

    // Create salons table
    if (!(await tableExists('salons'))) {
      await db.schema.createTable('salons', (table) => {
        table.increments('id').primary();
        table.string('name', 100).notNullable();
        table.text('description');
        table.boolean('is_active').defaultTo(true);
        table.timestamps(true, true);
      });
      logger.info('✅ Created salons table');
    } else {
      logger.info('⚠️ salons table already exists');
    }

    // Create tarifas table
    if (!(await tableExists('tarifas'))) {
      await db.schema.createTable('tarifas', (table) => {
        table.increments('id').primary();
        table.string('name', 100).notNullable();
        table.text('description');
        table.decimal('multiplier', 4, 2).defaultTo(1.00);
        table.boolean('is_active').defaultTo(true);
        table.timestamps(true, true);
      });
      logger.info('✅ Created tarifas table');
    } else {
      logger.info('⚠️ tarifas table already exists');
    }

    // Create tables table
    if (!(await tableExists('tables'))) {
      await db.schema.createTable('tables', (table) => {
        table.increments('id').primary();
        table.string('table_number', 20).notNullable();
        table.string('description', 100);
        table.integer('salon_id').unsigned().references('id').inTable('salons').onDelete('SET NULL');
        table.integer('tarifa_id').unsigned().references('id').inTable('tarifas').onDelete('SET NULL');
        table.integer('max_capacity').defaultTo(4);
        table.enum('status', ['free', 'occupied', 'reserved', 'maintenance']).defaultTo('free');
        table.decimal('position_x', 8, 2).defaultTo(0);
        table.decimal('position_y', 8, 2).defaultTo(0);
        table.boolean('is_active').defaultTo(true);
        table.timestamps(true, true);
        table.unique(['table_number', 'salon_id']);
      });
      logger.info('✅ Created tables table');
    } else {
      logger.info('⚠️ tables table already exists');
    }

    logger.info('🏗️ Database migration completed successfully');

  } catch (error) {
    logger.error('❌ Database migration failed:', error);
    throw error;
  } finally {
    if (db) {
      await closeDatabase();
    }
  }
};

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  migrate()
    .then(() => {
      logger.info('✅ Migration completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      logger.error('❌ Migration failed:', error);
      process.exit(1);
    });
}

export default migrate;
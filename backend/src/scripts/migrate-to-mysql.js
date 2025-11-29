/**
 * SQLite to MySQL Migration Script
 * Migrates all data from SQLite development database to MySQL production
 */

import knex from 'knex';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../../.env.production') });

// Source database (SQLite)
const sourceDb = knex({
  client: 'sqlite3',
  connection: {
    filename: process.env.SOURCE_DB_PATH || './data/sysme.db'
  },
  useNullAsDefault: true
});

// Target database (MySQL)
const targetDb = knex({
  client: 'mysql2',
  connection: {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'sysme_production',
    charset: 'utf8mb4'
  }
});

// Table migration order (respecting foreign key constraints)
const MIGRATION_ORDER = [
  'users',
  'salons',
  'tarifas',
  'categories',
  'products',
  'tables',
  'sales',
  'sale_items'
];

// Data type conversions for MySQL
const convertDataTypes = (tableName, data) => {
  const converted = { ...data };

  // Convert boolean fields to MySQL format
  const booleanFields = {
    users: ['is_active', 'active'],
    categories: ['is_active'],
    products: ['is_active'],
    tables: ['is_active'],
    salons: ['is_active'],
    tarifas: ['is_active']
  };

  if (booleanFields[tableName]) {
    booleanFields[tableName].forEach(field => {
      if (converted[field] !== undefined) {
        converted[field] = converted[field] ? 1 : 0;
      }
    });
  }

  // Convert datetime fields to proper MySQL format
  const datetimeFields = ['created_at', 'updated_at', 'kitchen_started_at', 'kitchen_completed_at'];
  datetimeFields.forEach(field => {
    if (converted[field] && converted[field] !== 'CURRENT_TIMESTAMP') {
      const date = new Date(converted[field]);
      if (!isNaN(date.getTime())) {
        converted[field] = date.toISOString().slice(0, 19).replace('T', ' ');
      }
    }
  });

  // Convert JSON fields
  const jsonFields = {
    users: ['permissions']
  };

  if (jsonFields[tableName]) {
    jsonFields[tableName].forEach(field => {
      if (converted[field] && typeof converted[field] === 'string') {
        try {
          JSON.parse(converted[field]); // Validate JSON
        } catch (e) {
          converted[field] = '{}'; // Default empty object
        }
      }
    });
  }

  return converted;
};

// Create MySQL database schema
const createMySQLSchema = async () => {
  console.log('Creating MySQL database schema...');

  // Drop and recreate database
  await targetDb.raw(`DROP DATABASE IF EXISTS ${process.env.DB_NAME}`);
  await targetDb.raw(`CREATE DATABASE ${process.env.DB_NAME} CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
  await targetDb.raw(`USE ${process.env.DB_NAME}`);

  // Create tables with MySQL-optimized schema
  await targetDb.schema.createTable('users', (table) => {
    table.increments('id').primary();
    table.string('username', 50).notNullable().unique();
    table.string('email', 100).notNullable().unique();
    table.string('password', 255).notNullable();
    table.string('first_name', 50).notNullable();
    table.string('last_name', 50).notNullable();
    table.enum('role', ['admin', 'manager', 'cashier', 'waiter', 'kitchen']).defaultTo('cashier');
    table.boolean('is_active').defaultTo(true);
    table.string('phone', 20).nullable();
    table.string('pin_code', 255).nullable();
    table.string('assigned_tpv', 20).defaultTo('TPV1');
    table.string('assigned_almacen', 50).defaultTo('Local');
    table.json('permissions').defaultTo('{}');
    table.boolean('active').defaultTo(true);
    table.timestamps(true, true);
    table.index(['username', 'is_active']);
    table.index(['role', 'is_active']);
  });

  await targetDb.schema.createTable('salons', (table) => {
    table.increments('id').primary();
    table.string('name', 100).notNullable();
    table.text('description').nullable();
    table.boolean('is_active').defaultTo(true);
    table.timestamps(true, true);
    table.index(['name', 'is_active']);
  });

  await targetDb.schema.createTable('tarifas', (table) => {
    table.increments('id').primary();
    table.string('name', 100).notNullable();
    table.text('description').nullable();
    table.decimal('multiplier', 5, 2).defaultTo(1.00);
    table.boolean('is_active').defaultTo(true);
    table.timestamps(true, true);
    table.index(['name', 'is_active']);
  });

  await targetDb.schema.createTable('categories', (table) => {
    table.increments('id').primary();
    table.string('name', 100).notNullable();
    table.text('description').nullable();
    table.integer('kitchen_order').defaultTo(0);
    table.boolean('is_active').defaultTo(true);
    table.timestamps(true, true);
    table.index(['name', 'is_active']);
  });

  await targetDb.schema.createTable('products', (table) => {
    table.increments('id').primary();
    table.string('name', 200).notNullable();
    table.text('description').nullable();
    table.decimal('price', 10, 2).notNullable();
    table.integer('category_id').unsigned().nullable();
    table.string('sku', 50).nullable();
    table.integer('stock_quantity').defaultTo(0);
    table.boolean('is_active').defaultTo(true);
    table.timestamps(true, true);
    table.foreign('category_id').references('id').inTable('categories').onDelete('SET NULL');
    table.index(['name', 'is_active']);
    table.index(['category_id', 'is_active']);
  });

  await targetDb.schema.createTable('tables', (table) => {
    table.increments('id').primary();
    table.string('table_number', 20).notNullable();
    table.string('description', 100).nullable();
    table.integer('salon_id').unsigned().notNullable();
    table.integer('tarifa_id').unsigned().notNullable();
    table.integer('max_capacity').defaultTo(4);
    table.enum('status', ['free', 'occupied', 'reserved', 'maintenance']).defaultTo('free');
    table.decimal('position_x', 8, 2).defaultTo(0);
    table.decimal('position_y', 8, 2).defaultTo(0);
    table.boolean('is_active').defaultTo(true);
    table.timestamps(true, true);
    table.foreign('salon_id').references('id').inTable('salons').onDelete('RESTRICT');
    table.foreign('tarifa_id').references('id').inTable('tarifas').onDelete('RESTRICT');
    table.unique(['table_number', 'salon_id']);
    table.index(['salon_id', 'status']);
  });

  await targetDb.schema.createTable('sales', (table) => {
    table.increments('id').primary();
    table.string('sale_number', 50).notNullable().unique();
    table.integer('table_id').unsigned().nullable();
    table.string('table_number', 20).nullable();
    table.integer('salon_id').unsigned().nullable();
    table.integer('tarifa_id').unsigned().nullable();
    table.integer('user_id').unsigned().notNullable();
    table.integer('waiter_id').unsigned().notNullable();
    table.decimal('original_subtotal', 10, 2).defaultTo(0);
    table.decimal('subtotal', 10, 2).notNullable();
    table.decimal('tax_amount', 10, 2).defaultTo(0);
    table.decimal('discount_amount', 10, 2).defaultTo(0);
    table.decimal('total', 10, 2).notNullable();
    table.decimal('tarifa_multiplier', 5, 2).defaultTo(1.00);
    table.enum('payment_method', ['pending', 'cash', 'card', 'transfer', 'mixed']).defaultTo('pending');
    table.enum('payment_status', ['pending', 'paid', 'refunded']).defaultTo('pending');
    table.enum('status', ['draft', 'confirmed', 'completed', 'cancelled']).defaultTo('draft');
    table.enum('kitchen_status', ['pending', 'preparing', 'ready', 'served']).defaultTo('pending');
    table.enum('order_type', ['table', 'takeaway', 'delivery']).defaultTo('table');
    table.boolean('kitchen_printed').defaultTo(false);
    table.datetime('kitchen_printed_at').nullable();
    table.datetime('kitchen_started_at').nullable();
    table.datetime('kitchen_completed_at').nullable();
    table.text('notes').nullable();
    table.text('kitchen_notes').nullable();
    table.timestamps(true, true);
    table.foreign('table_id').references('id').inTable('tables').onDelete('SET NULL');
    table.foreign('salon_id').references('id').inTable('salons').onDelete('SET NULL');
    table.foreign('tarifa_id').references('id').inTable('tarifas').onDelete('SET NULL');
    table.foreign('user_id').references('id').inTable('users').onDelete('RESTRICT');
    table.foreign('waiter_id').references('id').inTable('users').onDelete('RESTRICT');
    table.index(['sale_number']);
    table.index(['status', 'kitchen_status']);
    table.index(['created_at']);
  });

  await targetDb.schema.createTable('sale_items', (table) => {
    table.increments('id').primary();
    table.integer('sale_id').unsigned().notNullable();
    table.integer('product_id').unsigned().notNullable();
    table.string('product_name', 200).notNullable();
    table.decimal('quantity', 8, 2).notNullable();
    table.decimal('unit_price', 10, 2).notNullable();
    table.decimal('total_price', 10, 2).notNullable();
    table.decimal('original_unit_price', 10, 2).nullable();
    table.text('notes').nullable();
    table.timestamps(true, true);
    table.foreign('sale_id').references('id').inTable('sales').onDelete('CASCADE');
    table.foreign('product_id').references('id').inTable('products').onDelete('RESTRICT');
    table.index(['sale_id']);
    table.index(['product_id']);
  });

  console.log('MySQL schema created successfully!');
};

// Migrate data from SQLite to MySQL
const migrateTable = async (tableName) => {
  console.log(`Migrating table: ${tableName}`);

  try {
    // Check if table exists in source
    const tableExists = await sourceDb.schema.hasTable(tableName);
    if (!tableExists) {
      console.log(`Table ${tableName} doesn't exist in source database, skipping...`);
      return;
    }

    // Get all data from source table
    const sourceData = await sourceDb(tableName).select('*');

    if (sourceData.length === 0) {
      console.log(`Table ${tableName} is empty, skipping...`);
      return;
    }

    console.log(`Found ${sourceData.length} records in ${tableName}`);

    // Convert data types and insert in batches
    const batchSize = 100;
    for (let i = 0; i < sourceData.length; i += batchSize) {
      const batch = sourceData.slice(i, i + batchSize);
      const convertedBatch = batch.map(record => convertDataTypes(tableName, record));

      try {
        await targetDb(tableName).insert(convertedBatch);
        console.log(`Inserted batch ${Math.floor(i/batchSize) + 1} for table ${tableName}`);
      } catch (error) {
        console.error(`Error inserting batch for ${tableName}:`, error.message);
        // Try inserting records one by one to identify problematic records
        for (const record of convertedBatch) {
          try {
            await targetDb(tableName).insert(record);
          } catch (recordError) {
            console.error(`Failed to insert record in ${tableName}:`, record, recordError.message);
          }
        }
      }
    }

    console.log(`✓ Successfully migrated ${tableName}`);
  } catch (error) {
    console.error(`✗ Error migrating ${tableName}:`, error.message);
    throw error;
  }
};

// Main migration function
const runMigration = async () => {
  console.log('🚀 Starting SQLite to MySQL migration...');
  console.log(`Source: SQLite (${process.env.SOURCE_DB_PATH || './data/sysme.db'})`);
  console.log(`Target: MySQL (${process.env.DB_HOST}:${process.env.DB_PORT}/${process.env.DB_NAME})`);

  try {
    // Test connections
    console.log('Testing database connections...');
    await sourceDb.raw('SELECT 1');
    await targetDb.raw('SELECT 1');
    console.log('✓ Database connections successful');

    // Create schema
    await createMySQLSchema();

    // Migrate data
    console.log('\n📊 Starting data migration...');
    for (const tableName of MIGRATION_ORDER) {
      await migrateTable(tableName);
    }

    // Update auto-increment sequences
    console.log('\n🔧 Updating auto-increment sequences...');
    for (const tableName of MIGRATION_ORDER) {
      try {
        const maxId = await targetDb(tableName).max('id as max_id').first();
        if (maxId && maxId.max_id) {
          await targetDb.raw(`ALTER TABLE ${tableName} AUTO_INCREMENT = ${maxId.max_id + 1}`);
          console.log(`Updated auto-increment for ${tableName} to ${maxId.max_id + 1}`);
        }
      } catch (error) {
        console.log(`Note: Could not update auto-increment for ${tableName} (might not have id column)`);
      }
    }

    console.log('\n✅ Migration completed successfully!');
    console.log('\n📋 Post-migration checklist:');
    console.log('1. Update .env file to use MySQL configuration');
    console.log('2. Test application functionality');
    console.log('3. Backup the new MySQL database');
    console.log('4. Update production deployment configuration');

  } catch (error) {
    console.error('\n❌ Migration failed:', error.message);
    process.exit(1);
  } finally {
    // Close connections
    await sourceDb.destroy();
    await targetDb.destroy();
  }
};

// Run migration if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runMigration();
}

export { runMigration };
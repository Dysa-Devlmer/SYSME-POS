/**
 * Migration Runner Script
 * Ejecutar: node run-migrations.js
 */

import knex from 'knex';
import fs from 'fs';

const dbPath = process.env.DB_PATH || './data/sysme.db';
console.log('🔧 SYSME-POS Migration Runner\n');
console.log('📁 Base de datos:', dbPath);

const db = knex({
  client: 'sqlite3',
  connection: { filename: dbPath },
  useNullAsDefault: true
});

async function tableExists(tableName) {
  const result = await db.raw(
    "SELECT name FROM sqlite_master WHERE type='table' AND name=?",
    [tableName]
  );
  return result.length > 0;
}

async function runMigrations() {
  try {
    if (!fs.existsSync(dbPath)) {
      console.log('❌ BD no encontrada. Ejecuta primero el backend.');
      process.exit(1);
    }

    // Create cash_sessions
    if (!(await tableExists('cash_sessions'))) {
      console.log('📋 Creando tabla cash_sessions...');
      await db.schema.createTable('cash_sessions', (table) => {
        table.increments('id').primary();
        table.string('session_number', 50).unique().notNullable();
        table.integer('user_id').unsigned().notNullable();
        table.enum('status', ['open', 'closed', 'suspended']).defaultTo('open');
        table.decimal('opening_balance', 10, 2).defaultTo(0);
        table.decimal('closing_balance', 10, 2);
        table.decimal('expected_balance', 10, 2);
        table.decimal('difference', 10, 2);
        table.decimal('total_sales', 10, 2).defaultTo(0);
        table.decimal('total_cash', 10, 2).defaultTo(0);
        table.decimal('total_card', 10, 2).defaultTo(0);
        table.decimal('total_other', 10, 2).defaultTo(0);
        table.decimal('total_in', 10, 2).defaultTo(0);
        table.decimal('total_out', 10, 2).defaultTo(0);
        table.integer('sales_count').defaultTo(0);
        table.timestamp('opened_at').defaultTo(db.fn.now());
        table.timestamp('closed_at');
        table.text('notes');
        table.timestamps(true, true);
      });
      console.log('  ✅ cash_sessions creada');
    } else {
      console.log('  ✓ cash_sessions ya existe');
    }

    // Create cash_movements
    if (!(await tableExists('cash_movements'))) {
      console.log('📋 Creando tabla cash_movements...');
      await db.schema.createTable('cash_movements', (table) => {
        table.increments('id').primary();
        table.integer('cash_session_id').unsigned().notNullable();
        table.enum('type', ['in', 'out', 'sale', 'opening', 'closing']).notNullable();
        table.decimal('amount', 10, 2).notNullable();
        table.string('payment_method', 50);
        table.integer('reference_id').unsigned();
        table.string('reference_type', 50);
        table.string('reason', 255);
        table.text('notes');
        table.integer('user_id').unsigned().notNullable();
        table.timestamp('created_at').defaultTo(db.fn.now());
      });
      console.log('  ✅ cash_movements creada');
    } else {
      console.log('  ✓ cash_movements ya existe');
    }

    // Create z_reports
    if (!(await tableExists('z_reports'))) {
      console.log('📋 Creando tabla z_reports...');
      await db.schema.createTable('z_reports', (table) => {
        table.increments('id').primary();
        table.string('report_number', 50).unique().notNullable();
        table.integer('cash_session_id').unsigned().notNullable();
        table.date('report_date').notNullable();
        table.integer('user_id').unsigned().notNullable();
        table.decimal('total_sales', 10, 2).notNullable();
        table.decimal('total_tax', 10, 2).notNullable();
        table.decimal('total_discount', 10, 2).defaultTo(0);
        table.decimal('total_cash', 10, 2).defaultTo(0);
        table.decimal('total_card', 10, 2).defaultTo(0);
        table.decimal('total_other', 10, 2).defaultTo(0);
        table.integer('sales_count').notNullable();
        table.integer('cancelled_count').defaultTo(0);
        table.integer('refunded_count').defaultTo(0);
        table.decimal('opening_balance', 10, 2).notNullable();
        table.decimal('closing_balance', 10, 2).notNullable();
        table.decimal('difference', 10, 2).defaultTo(0);
        table.text('report_data');
        table.boolean('printed').defaultTo(false);
        table.timestamp('printed_at');
        table.timestamp('created_at').defaultTo(db.fn.now());
      });
      console.log('  ✅ z_reports creada');
    } else {
      console.log('  ✓ z_reports ya existe');
    }

    // Añadir cash_session_id a sales si no existe
    const salesColumns = await db.raw('PRAGMA table_info(sales)');
    const hasCashSessionId = salesColumns.some(col => col.name === 'cash_session_id');

    if (!hasCashSessionId) {
      console.log('📋 Añadiendo cash_session_id a sales...');
      await db.schema.alterTable('sales', (table) => {
        table.integer('cash_session_id').unsigned();
      });
      console.log('  ✅ cash_session_id añadido a sales');
    } else {
      console.log('  ✓ sales.cash_session_id ya existe');
    }

    console.log('\n✅ Migraciones completadas');
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await db.destroy();
  }
}

runMigrations().then(() => process.exit(0)).catch(() => process.exit(1));

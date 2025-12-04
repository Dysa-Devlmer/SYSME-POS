/**
 * Database Migration Script
 * Applies necessary schema changes to existing database
 */

const Database = require('better-sqlite3');
const path = require('path');

const DB_PATH = './data/sysme.db';

console.log('🔄 SYSME POS - Database Migration Tool');
console.log('=======================================\n');

try {
  // Connect to database
  const db = new Database(DB_PATH);
  console.log('✅ Database connection established\n');

  // Enable foreign keys
  db.pragma('foreign_keys = ON');

  // Track migration results
  let successCount = 0;
  let skipCount = 0;
  let errorCount = 0;

  // Migration 1: Add cash_session_id to sales table
  console.log('📝 Migration 1: Adding cash_session_id to sales table...');
  try {
    // Check if column exists
    const salesColumns = db.prepare('PRAGMA table_info(sales)').all();
    const hasCashSessionId = salesColumns.some(col => col.name === 'cash_session_id');

    if (!hasCashSessionId) {
      db.exec(`
        ALTER TABLE sales
        ADD COLUMN cash_session_id INTEGER REFERENCES cash_sessions(id);
      `);
      console.log('   ✅ Added cash_session_id column to sales table');
      successCount++;
    } else {
      console.log('   ⏭️  Column cash_session_id already exists');
      skipCount++;
    }
  } catch (error) {
    console.error('   ❌ Error:', error.message);
    errorCount++;
  }

  // Migration 2: Add tip_amount to sales table (if not exists)
  console.log('\n📝 Migration 2: Adding tip_amount to sales table...');
  try {
    const salesColumns = db.prepare('PRAGMA table_info(sales)').all();
    const hasTipAmount = salesColumns.some(col => col.name === 'tip_amount');

    if (!hasTipAmount) {
      db.exec(`
        ALTER TABLE sales
        ADD COLUMN tip_amount DECIMAL(10,2) DEFAULT 0;
      `);
      console.log('   ✅ Added tip_amount column to sales table');
      successCount++;
    } else {
      console.log('   ⏭️  Column tip_amount already exists');
      skipCount++;
    }
  } catch (error) {
    console.error('   ❌ Error:', error.message);
    errorCount++;
  }

  // Migration 3: Create z_reports table if not exists
  console.log('\n📝 Migration 3: Creating z_reports table...');
  try {
    const tableExists = db.prepare(
      "SELECT name FROM sqlite_master WHERE type='table' AND name='z_reports'"
    ).get();

    if (!tableExists) {
      db.exec(`
        CREATE TABLE IF NOT EXISTS z_reports (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          report_number VARCHAR(50) UNIQUE NOT NULL,
          cash_session_id INTEGER NOT NULL,
          report_date DATE NOT NULL,
          opening_balance DECIMAL(10,2) NOT NULL,
          closing_balance DECIMAL(10,2) NOT NULL,
          total_sales DECIMAL(10,2) NOT NULL,
          total_cash DECIMAL(10,2) NOT NULL,
          total_card DECIMAL(10,2) NOT NULL,
          total_other DECIMAL(10,2) NOT NULL,
          total_in DECIMAL(10,2) NOT NULL,
          total_out DECIMAL(10,2) NOT NULL,
          difference DECIMAL(10,2) NOT NULL,
          sales_count INTEGER NOT NULL,
          generated_by INTEGER NOT NULL,
          notes TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (cash_session_id) REFERENCES cash_sessions(id),
          FOREIGN KEY (generated_by) REFERENCES users(id)
        );
      `);
      console.log('   ✅ Created z_reports table');
      successCount++;
    } else {
      console.log('   ⏭️  Table z_reports already exists');
      skipCount++;
    }
  } catch (error) {
    console.error('   ❌ Error:', error.message);
    errorCount++;
  }

  // Migration 4: Create indexes for better performance
  console.log('\n📝 Migration 4: Creating performance indexes...');

  const indexes = [
    { name: 'idx_sales_cash_session', table: 'sales', column: 'cash_session_id' },
    { name: 'idx_sales_created_at', table: 'sales', column: 'created_at' },
    { name: 'idx_cash_sessions_status', table: 'cash_sessions', column: 'status' },
    { name: 'idx_cash_sessions_user', table: 'cash_sessions', column: 'user_id' },
    { name: 'idx_cash_movements_session', table: 'cash_movements', column: 'cash_session_id' },
  ];

  for (const idx of indexes) {
    try {
      // Check if index exists
      const indexExists = db.prepare(
        `SELECT name FROM sqlite_master WHERE type='index' AND name=?`
      ).get(idx.name);

      if (!indexExists) {
        db.exec(`CREATE INDEX ${idx.name} ON ${idx.table}(${idx.column});`);
        console.log(`   ✅ Created index ${idx.name}`);
        successCount++;
      } else {
        console.log(`   ⏭️  Index ${idx.name} already exists`);
        skipCount++;
      }
    } catch (error) {
      console.error(`   ❌ Error creating index ${idx.name}:`, error.message);
      errorCount++;
    }
  }

  // Summary
  console.log('\n=======================================');
  console.log('📊 Migration Summary:');
  console.log(`   ✅ Successful: ${successCount}`);
  console.log(`   ⏭️  Skipped: ${skipCount}`);
  if (errorCount > 0) {
    console.log(`   ❌ Errors: ${errorCount}`);
  }
  console.log('=======================================\n');

  // Verify critical columns
  console.log('🔍 Verifying database structure...\n');

  const salesCols = db.prepare('PRAGMA table_info(sales)').all();
  const hasCashSessionId = salesCols.some(col => col.name === 'cash_session_id');
  const hasTipAmount = salesCols.some(col => col.name === 'tip_amount');

  console.log('Sales table columns:');
  console.log(`   cash_session_id: ${hasCashSessionId ? '✅' : '❌'}`);
  console.log(`   tip_amount: ${hasTipAmount ? '✅' : '❌'}`);

  const zReportsExists = db.prepare(
    "SELECT name FROM sqlite_master WHERE type='table' AND name='z_reports'"
  ).get();
  console.log(`\nz_reports table: ${zReportsExists ? '✅' : '❌'}`);

  db.close();

  console.log('\n✅ Migration completed successfully!\n');
  console.log('📝 Next steps:');
  console.log('   1. Restart backend: npm run dev');
  console.log('   2. Test cash register functionality');
  console.log('   3. Verify reports are working\n');

  process.exit(0);

} catch (error) {
  console.error('\n❌ Migration failed:', error.message);
  console.error(error.stack);
  process.exit(1);
}

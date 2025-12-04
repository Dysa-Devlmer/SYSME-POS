/**
 * Direct Database Initialization Script
 * Creates/updates SQLite database tables for SYSME POS
 */

const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');

const DB_PATH = './data/sysme.db';
const SCHEMA_PATH = './src/database/schema.sql';

console.log('🚀 SYSME Database Initialization\n');
console.log('================================\n');

try {
  // Ensure data directory exists
  const dataDir = path.dirname(DB_PATH);
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
    console.log('✅ Created data directory');
  }

  // Check if schema file exists
  if (!fs.existsSync(SCHEMA_PATH)) {
    console.error(`❌ Schema file not found: ${SCHEMA_PATH}`);
    process.exit(1);
  }

  // Read schema
  const schema = fs.readFileSync(SCHEMA_PATH, 'utf8');
  console.log('✅ Schema file loaded');

  // Connect to database
  const db = new Database(DB_PATH);
  console.log('✅ Database connection established');

  // Enable foreign keys
  db.pragma('foreign_keys = ON');

  // Split schema into individual statements
  const statements = schema
    .split(';')
    .map(stmt => stmt.trim())
    .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));

  console.log(`\n📋 Executing ${statements.length} SQL statements...\n`);

  let successCount = 0;
  let skipCount = 0;
  let errorCount = 0;

  // Execute each statement
  for (let i = 0; i < statements.length; i++) {
    const statement = statements[i];
    try {
      db.exec(statement + ';');

      // Extract table name if it's a CREATE TABLE statement
      const match = statement.match(/CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?(\w+)/i);
      if (match) {
        console.log(`   ✓ ${match[1]}`);
      }
      successCount++;
    } catch (error) {
      if (error.message.includes('already exists')) {
        skipCount++;
      } else {
        console.error(`   ✗ Error: ${error.message.substring(0, 80)}`);
        errorCount++;
      }
    }
  }

  console.log('\n================================');
  console.log(`✅ Successful: ${successCount}`);
  console.log(`⏭️  Skipped (already exists): ${skipCount}`);
  if (errorCount > 0) {
    console.log(`❌ Errors: ${errorCount}`);
  }

  // Verify tables
  const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name").all();
  console.log(`\n📊 Total tables in database: ${tables.length}`);

  // Verify users table
  const userCount = db.prepare('SELECT COUNT(*) as count FROM users').get();
  console.log(`👥 Users in database: ${userCount.count}`);

  db.close();
  console.log('\n✅ Database initialization complete!\n');
  process.exit(0);

} catch (error) {
  console.error('\n❌ Database initialization failed:', error.message);
  console.error(error.stack);
  process.exit(1);
}

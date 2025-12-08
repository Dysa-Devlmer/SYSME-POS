// =====================================================
// SYSME POS - Database Initialization Script
// =====================================================
// Runs all migrations and seeds initial data
// @author JARVIS AI Assistant
// @date 2025-11-20
// =====================================================

const Database = require('better-sqlite3');
const fs = require('fs');
const path = require('path');

const DB_PATH = path.join(__dirname, 'data', 'sysme-pos.db');
const MIGRATIONS_PATH = path.join(__dirname, 'migrations');

console.log('🚀 SYSME POS - Database Initialization');
console.log('=====================================\n');

// Ensure data directory exists
const dataDir = path.dirname(DB_PATH);
if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
    console.log('✅ Created data directory');
}

// Connect to database
const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

console.log(`✅ Connected to database: ${DB_PATH}\n`);

// Get all migration files
const migrationFiles = fs.readdirSync(MIGRATIONS_PATH)
    .filter(file => file.endsWith('.sql'))
    .sort();

console.log(`📁 Found ${migrationFiles.length} migration files\n`);

// Disable foreign keys temporarily during migration
db.pragma('foreign_keys = OFF');

// Run each migration
let successCount = 0;
let failCount = 0;

for (const file of migrationFiles) {
    try {
        console.log(`⏳ Running migration: ${file}...`);

        const sql = fs.readFileSync(path.join(MIGRATIONS_PATH, file), 'utf-8');

        // Execute the entire file at once (SQLite can handle it)
        db.exec(sql);

        console.log(`   ✅ ${file} completed`);
        successCount++;

    } catch (error) {
        console.error(`   ❌ ${file} failed:`, error.message);
        failCount++;
    }
}

// Re-enable foreign keys
db.pragma('foreign_keys = ON');

console.log('\n=====================================');
console.log(`✅ Migrations completed: ${successCount}/${migrationFiles.length}`);
if (failCount > 0) {
    console.log(`❌ Migrations failed: ${failCount}`);
}

// Get table count
const tables = db.prepare("SELECT COUNT(*) as count FROM sqlite_master WHERE type='table'").get();
console.log(`📊 Total tables created: ${tables.count}`);

// Database statistics
console.log('\n📈 Database Statistics:');
console.log('=====================================');

const stats = {
    'Companies': db.prepare('SELECT COUNT(*) as count FROM companies').get().count,
    'Locations': db.prepare('SELECT COUNT(*) as count FROM locations').get().count,
    'Users': db.prepare('SELECT COUNT(*) as count FROM users').get().count,
    'Categories': db.prepare('SELECT COUNT(*) as count FROM categories').get().count,
    'Products': db.prepare('SELECT COUNT(*) as count FROM products').get().count,
    'Tables': db.prepare('SELECT COUNT(*) as count FROM tables').get().count
};

for (const [key, value] of Object.entries(stats)) {
    console.log(`   ${key}: ${value}`);
}

console.log('\n✨ Database initialization complete!');
console.log('=====================================\n');

db.close();

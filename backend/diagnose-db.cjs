/**
 * Database Diagnostic and Repair Script
 * Verifies critical tables and creates missing ones
 */

const Database = require('better-sqlite3');
const path = require('path');

const DB_PATH = './data/sysme.db';

console.log('🔍 SYSME POS - Database Diagnostic Tool');
console.log('=========================================\n');

try {
  // Connect to database
  const db = new Database(DB_PATH);
  console.log('✅ Database connection established\n');

  // Critical tables to check
  const criticalTables = {
    users: `
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username VARCHAR(50) UNIQUE NOT NULL,
        email VARCHAR(100) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        first_name VARCHAR(50) NOT NULL,
        last_name VARCHAR(50) NOT NULL,
        role VARCHAR(20) DEFAULT 'cashier',
        is_active BOOLEAN DEFAULT 1,
        phone VARCHAR(20),
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `,
    cash_sessions: `
      CREATE TABLE IF NOT EXISTS cash_sessions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        session_number VARCHAR(50) UNIQUE NOT NULL,
        user_id INTEGER NOT NULL,
        status VARCHAR(20) DEFAULT 'open',
        opening_balance DECIMAL(10,2) NOT NULL DEFAULT 0,
        closing_balance DECIMAL(10,2),
        expected_balance DECIMAL(10,2),
        difference DECIMAL(10,2),
        total_sales DECIMAL(10,2) DEFAULT 0,
        total_cash DECIMAL(10,2) DEFAULT 0,
        total_card DECIMAL(10,2) DEFAULT 0,
        total_other DECIMAL(10,2) DEFAULT 0,
        total_in DECIMAL(10,2) DEFAULT 0,
        total_out DECIMAL(10,2) DEFAULT 0,
        sales_count INTEGER DEFAULT 0,
        opened_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        closed_at DATETIME,
        notes TEXT,
        FOREIGN KEY (user_id) REFERENCES users(id)
      )
    `,
    cash_movements: `
      CREATE TABLE IF NOT EXISTS cash_movements (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        cash_session_id INTEGER NOT NULL,
        type VARCHAR(20) NOT NULL,
        amount DECIMAL(10,2) NOT NULL,
        payment_method VARCHAR(50),
        reference_id INTEGER,
        reference_type VARCHAR(50),
        reason VARCHAR(255),
        notes TEXT,
        user_id INTEGER NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (cash_session_id) REFERENCES cash_sessions(id),
        FOREIGN KEY (user_id) REFERENCES users(id)
      )
    `,
    sales: `
      CREATE TABLE IF NOT EXISTS sales (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        sale_number VARCHAR(50) UNIQUE NOT NULL,
        customer_id INTEGER,
        table_id INTEGER,
        user_id INTEGER NOT NULL,
        subtotal DECIMAL(10,2) NOT NULL,
        tax_amount DECIMAL(10,2) DEFAULT 0,
        discount_amount DECIMAL(10,2) DEFAULT 0,
        tip_amount DECIMAL(10,2) DEFAULT 0,
        total DECIMAL(10,2) NOT NULL,
        payment_method VARCHAR(50),
        payment_status VARCHAR(20) DEFAULT 'pending',
        status VARCHAR(20) DEFAULT 'pending',
        notes TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id)
      )
    `,
    sale_items: `
      CREATE TABLE IF NOT EXISTS sale_items (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        sale_id INTEGER NOT NULL,
        product_id INTEGER NOT NULL,
        product_name VARCHAR(150) NOT NULL,
        quantity DECIMAL(8,2) NOT NULL,
        unit_price DECIMAL(10,2) NOT NULL,
        total_price DECIMAL(10,2) NOT NULL,
        notes TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (sale_id) REFERENCES sales(id) ON DELETE CASCADE
      )
    `,
    categories: `
      CREATE TABLE IF NOT EXISTS categories (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name VARCHAR(100) NOT NULL,
        description TEXT,
        color VARCHAR(7) DEFAULT '#6366f1',
        is_active BOOLEAN DEFAULT 1,
        sort_order INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `,
    products: `
      CREATE TABLE IF NOT EXISTS products (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name VARCHAR(150) NOT NULL,
        description TEXT,
        price DECIMAL(10,2) NOT NULL,
        cost DECIMAL(10,2) DEFAULT 0,
        category_id INTEGER,
        stock INTEGER DEFAULT 0,
        min_stock INTEGER DEFAULT 5,
        sku VARCHAR(50) UNIQUE,
        barcode VARCHAR(100),
        image_url VARCHAR(255),
        is_active BOOLEAN DEFAULT 1,
        is_trackable BOOLEAN DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (category_id) REFERENCES categories(id)
      )
    `,
    tables: `
      CREATE TABLE IF NOT EXISTS tables (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        table_number VARCHAR(10) NOT NULL UNIQUE,
        capacity INTEGER DEFAULT 4,
        status VARCHAR(20) DEFAULT 'available',
        location VARCHAR(50),
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `
  };

  console.log('📋 Checking Critical Tables:');
  console.log('─────────────────────────────\n');

  for (const [tableName, createSQL] of Object.entries(criticalTables)) {
    try {
      // Check if table exists
      const tableExists = db.prepare(
        "SELECT name FROM sqlite_master WHERE type='table' AND name=?"
      ).get(tableName);

      if (tableExists) {
        // Get column info
        const columns = db.prepare(`PRAGMA table_info(${tableName})`).all();
        console.log(`✅ ${tableName.padEnd(20)} EXISTS (${columns.length} columns)`);

        // Show structure
        console.log(`   Columns: ${columns.map(c => c.name).join(', ')}`);
      } else {
        console.log(`❌ ${tableName.padEnd(20)} MISSING - Creating...`);
        db.exec(createSQL);
        console.log(`   ✅ Created successfully`);
      }
    } catch (error) {
      console.error(`   ❌ Error with ${tableName}:`, error.message);
    }
    console.log('');
  }

  // Verify all tables
  const allTables = db.prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name").all();
  console.log('─────────────────────────────');
  console.log(`📊 Total Tables: ${allTables.length}`);
  console.log('─────────────────────────────\n');

  // Check users
  const userCount = db.prepare('SELECT COUNT(*) as count FROM users').get();
  console.log(`👥 Users in database: ${userCount.count}`);

  if (userCount.count > 0) {
    const users = db.prepare('SELECT id, username, role, is_active FROM users').all();
    console.log('\nUser List:');
    users.forEach(u => {
      console.log(`   - ${u.username.padEnd(20)} (${u.role}) ${u.is_active ? '✅' : '❌'}`);
    });
  }

  console.log('');

  // Check cash sessions
  const sessionCount = db.prepare('SELECT COUNT(*) as count FROM cash_sessions').get();
  console.log(`💰 Cash sessions: ${sessionCount.count}`);

  // Check sales
  const salesCount = db.prepare('SELECT COUNT(*) as count FROM sales').get();
  console.log(`🛒 Sales: ${salesCount.count}`);

  // Check products
  const productCount = db.prepare('SELECT COUNT(*) as count FROM products').get();
  console.log(`📦 Products: ${productCount.count}`);

  // Check categories
  const categoryCount = db.prepare('SELECT COUNT(*) as count FROM categories').get();
  console.log(`📁 Categories: ${categoryCount.count}`);

  console.log('\n─────────────────────────────');
  console.log('✅ Database diagnostic complete!');
  console.log('─────────────────────────────\n');

  console.log('📝 Recommendations:');
  console.log('   1. Restart backend: npm run dev');
  console.log('   2. Reload frontend in browser');
  console.log('   3. Try opening cash register\n');

  db.close();
  process.exit(0);

} catch (error) {
  console.error('\n❌ Diagnostic failed:', error.message);
  console.error(error.stack);
  process.exit(1);
}

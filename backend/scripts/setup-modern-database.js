#!/usr/bin/env node

/**
 * SYSME Modern Database Setup Script
 * Creates the modern database schema for SYSME 2.0
 * 
 * Usage:
 *   node setup-modern-database.js [--env=staging|production] [--drop-existing]
 */

const mysql = require('mysql2/promise');
const fs = require('fs').promises;
const path = require('path');

// Configuration
const CONFIG = {
  DB: {
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_ROOT_PASSWORD || '',
    database: process.env.DB_NAME || 'sysme_staging'
  },
  DROP_EXISTING: process.argv.includes('--drop-existing'),
  ENV: process.argv.includes('--env=production') ? 'production' : 'staging'
};

class ModernDatabaseSetup {
  constructor() {
    this.db = null;
  }

  async connect() {
    try {
      console.log('🔌 Connecting to MySQL server...');
      
      // First connect without database to create it if needed
      const connectionConfig = { ...CONFIG.DB };
      delete connectionConfig.database;
      
      this.db = await mysql.createConnection(connectionConfig);
      console.log('✅ Connected to MySQL server');
      
    } catch (error) {
      console.error('❌ MySQL connection failed:', error.message);
      throw error;
    }
  }

  async createDatabase() {
    try {
      console.log(`🗄️ Creating database: ${CONFIG.DB.database}...`);
      
      if (CONFIG.DROP_EXISTING) {
        await this.db.execute(`DROP DATABASE IF EXISTS ${CONFIG.DB.database}`);
        console.log('🗑️ Existing database dropped');
      }
      
      await this.db.execute(`CREATE DATABASE IF NOT EXISTS ${CONFIG.DB.database} 
        CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
      
      await this.db.execute(`USE ${CONFIG.DB.database}`);
      console.log('✅ Database created and selected');
      
    } catch (error) {
      console.error('❌ Database creation failed:', error.message);
      throw error;
    }
  }

  async createTables() {
    console.log('📋 Creating modern database schema...');
    
    const tables = [
      {
        name: 'users',
        sql: `
          CREATE TABLE users (
            id INT PRIMARY KEY AUTO_INCREMENT,
            legacy_id INT NULL UNIQUE,
            username VARCHAR(50) UNIQUE NOT NULL,
            email VARCHAR(100) UNIQUE NOT NULL,
            first_name VARCHAR(50) NOT NULL,
            last_name VARCHAR(50) NOT NULL,
            password_hash VARCHAR(255) NOT NULL,
            role ENUM('admin', 'manager', 'cashier', 'user') DEFAULT 'user',
            is_active BOOLEAN DEFAULT true,
            email_verified BOOLEAN DEFAULT false,
            email_verification_token VARCHAR(255) NULL,
            password_reset_token VARCHAR(255) NULL,
            password_reset_expires DATETIME NULL,
            last_login DATETIME NULL,
            login_attempts INT DEFAULT 0,
            locked_until DATETIME NULL,
            two_factor_enabled BOOLEAN DEFAULT false,
            two_factor_secret VARCHAR(32) NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            
            INDEX idx_username (username),
            INDEX idx_email (email),
            INDEX idx_role (role),
            INDEX idx_legacy_id (legacy_id)
          ) ENGINE=InnoDB CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
        `
      },
      {
        name: 'categories',
        sql: `
          CREATE TABLE categories (
            id INT PRIMARY KEY AUTO_INCREMENT,
            legacy_id INT NULL UNIQUE,
            name VARCHAR(100) NOT NULL,
            description TEXT NULL,
            sort_order INT DEFAULT 0,
            is_active BOOLEAN DEFAULT true,
            color VARCHAR(7) DEFAULT '#6366f1',
            image_url VARCHAR(255) NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            
            INDEX idx_name (name),
            INDEX idx_sort_order (sort_order),
            INDEX idx_active (is_active),
            INDEX idx_legacy_id (legacy_id)
          ) ENGINE=InnoDB CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
        `
      },
      {
        name: 'products',
        sql: `
          CREATE TABLE products (
            id INT PRIMARY KEY AUTO_INCREMENT,
            legacy_id INT NULL UNIQUE,
            name VARCHAR(200) NOT NULL,
            description TEXT NULL,
            price DECIMAL(10,2) NOT NULL DEFAULT 0.00,
            cost DECIMAL(10,2) NULL DEFAULT 0.00,
            stock INT DEFAULT 0,
            min_stock INT DEFAULT 0,
            stock_status ENUM('in_stock', 'low_stock', 'out_of_stock') DEFAULT 'in_stock',
            category_id INT NOT NULL,
            image_url VARCHAR(255) NULL,
            is_active BOOLEAN DEFAULT true,
            is_featured BOOLEAN DEFAULT false,
            ingredients JSON NULL,
            allergens JSON NULL,
            nutritional_info JSON NULL,
            preparation_time INT NULL COMMENT 'Minutes',
            calories INT NULL,
            tags JSON NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            
            FOREIGN KEY (category_id) REFERENCES categories(id) ON UPDATE CASCADE ON DELETE RESTRICT,
            INDEX idx_name (name),
            INDEX idx_category (category_id),
            INDEX idx_price (price),
            INDEX idx_stock_status (stock_status),
            INDEX idx_active (is_active),
            INDEX idx_featured (is_featured),
            INDEX idx_legacy_id (legacy_id),
            FULLTEXT idx_search (name, description)
          ) ENGINE=InnoDB CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
        `
      },
      {
        name: 'sales',
        sql: `
          CREATE TABLE sales (
            id INT PRIMARY KEY AUTO_INCREMENT,
            legacy_id INT NULL UNIQUE,
            invoice_number VARCHAR(50) NOT NULL UNIQUE,
            sale_date DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            subtotal DECIMAL(10,2) NOT NULL DEFAULT 0.00,
            discount DECIMAL(10,2) DEFAULT 0.00,
            discount_percentage DECIMAL(5,2) DEFAULT 0.00,
            tax DECIMAL(10,2) DEFAULT 0.00,
            tax_percentage DECIMAL(5,2) DEFAULT 0.00,
            total DECIMAL(10,2) NOT NULL,
            user_id INT NULL,
            customer_name VARCHAR(100) NULL,
            customer_email VARCHAR(100) NULL,
            customer_phone VARCHAR(20) NULL,
            payment_method ENUM('cash', 'card', 'transfer', 'mixed') DEFAULT 'cash',
            payment_details JSON NULL,
            status ENUM('pending', 'completed', 'cancelled', 'refunded') DEFAULT 'completed',
            table_number VARCHAR(10) NULL,
            order_type ENUM('dine_in', 'takeaway', 'delivery') DEFAULT 'dine_in',
            notes TEXT NULL,
            printed BOOLEAN DEFAULT false,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            
            FOREIGN KEY (user_id) REFERENCES users(id) ON UPDATE CASCADE ON DELETE SET NULL,
            INDEX idx_invoice (invoice_number),
            INDEX idx_date (sale_date),
            INDEX idx_total (total),
            INDEX idx_user (user_id),
            INDEX idx_status (status),
            INDEX idx_payment_method (payment_method),
            INDEX idx_legacy_id (legacy_id)
          ) ENGINE=InnoDB CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
        `
      },
      {
        name: 'sale_items',
        sql: `
          CREATE TABLE sale_items (
            id INT PRIMARY KEY AUTO_INCREMENT,
            sale_id INT NOT NULL,
            product_id INT NOT NULL,
            quantity INT NOT NULL DEFAULT 1,
            unit_price DECIMAL(10,2) NOT NULL,
            subtotal DECIMAL(10,2) NOT NULL,
            notes TEXT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            
            FOREIGN KEY (sale_id) REFERENCES sales(id) ON UPDATE CASCADE ON DELETE CASCADE,
            FOREIGN KEY (product_id) REFERENCES products(id) ON UPDATE CASCADE ON DELETE RESTRICT,
            INDEX idx_sale (sale_id),
            INDEX idx_product (product_id)
          ) ENGINE=InnoDB CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
        `
      },
      {
        name: 'user_sessions',
        sql: `
          CREATE TABLE user_sessions (
            id VARCHAR(128) PRIMARY KEY,
            user_id INT NOT NULL,
            data TEXT NOT NULL,
            expires DATETIME NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            
            FOREIGN KEY (user_id) REFERENCES users(id) ON UPDATE CASCADE ON DELETE CASCADE,
            INDEX idx_user (user_id),
            INDEX idx_expires (expires)
          ) ENGINE=InnoDB CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
        `
      },
      {
        name: 'audit_log',
        sql: `
          CREATE TABLE audit_log (
            id BIGINT PRIMARY KEY AUTO_INCREMENT,
            user_id INT NULL,
            action VARCHAR(50) NOT NULL,
            entity_type VARCHAR(50) NOT NULL,
            entity_id INT NULL,
            old_data JSON NULL,
            new_data JSON NULL,
            ip_address VARCHAR(45) NULL,
            user_agent TEXT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            
            FOREIGN KEY (user_id) REFERENCES users(id) ON UPDATE CASCADE ON DELETE SET NULL,
            INDEX idx_user (user_id),
            INDEX idx_action (action),
            INDEX idx_entity (entity_type, entity_id),
            INDEX idx_created (created_at)
          ) ENGINE=InnoDB CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
        `
      },
      {
        name: 'system_settings',
        sql: `
          CREATE TABLE system_settings (
            id INT PRIMARY KEY AUTO_INCREMENT,
            key_name VARCHAR(100) UNIQUE NOT NULL,
            value TEXT NULL,
            data_type ENUM('string', 'number', 'boolean', 'json') DEFAULT 'string',
            description TEXT NULL,
            is_sensitive BOOLEAN DEFAULT false,
            updated_by INT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            
            FOREIGN KEY (updated_by) REFERENCES users(id) ON UPDATE CASCADE ON DELETE SET NULL,
            INDEX idx_key (key_name)
          ) ENGINE=InnoDB CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
        `
      },
      {
        name: 'notifications',
        sql: `
          CREATE TABLE notifications (
            id INT PRIMARY KEY AUTO_INCREMENT,
            user_id INT NULL,
            type VARCHAR(50) NOT NULL,
            title VARCHAR(200) NOT NULL,
            message TEXT NOT NULL,
            data JSON NULL,
            is_read BOOLEAN DEFAULT false,
            expires_at DATETIME NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            read_at DATETIME NULL,
            
            FOREIGN KEY (user_id) REFERENCES users(id) ON UPDATE CASCADE ON DELETE CASCADE,
            INDEX idx_user (user_id),
            INDEX idx_type (type),
            INDEX idx_read (is_read),
            INDEX idx_created (created_at)
          ) ENGINE=InnoDB CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
        `
      }
    ];

    for (const table of tables) {
      try {
        console.log(`📝 Creating table: ${table.name}...`);
        await this.db.execute(table.sql);
        console.log(`✅ Table created: ${table.name}`);
      } catch (error) {
        console.error(`❌ Failed to create table ${table.name}:`, error.message);
        throw error;
      }
    }
  }

  async createIndexes() {
    console.log('🔍 Creating additional indexes...');
    
    const indexes = [
      'CREATE INDEX idx_sales_date_status ON sales(sale_date, status)',
      'CREATE INDEX idx_products_category_active ON products(category_id, is_active)',
      'CREATE INDEX idx_users_role_active ON users(role, is_active)',
      'CREATE INDEX idx_audit_created_action ON audit_log(created_at, action)'
    ];

    for (const index of indexes) {
      try {
        await this.db.execute(index);
        console.log('✅ Index created');
      } catch (error) {
        console.warn(`⚠️ Index creation warning: ${error.message}`);
      }
    }
  }

  async insertDefaultData() {
    console.log('📊 Inserting default data...');
    
    try {
      // Default admin user
      const bcrypt = require('bcrypt');
      const adminPassword = await bcrypt.hash('admin123', 12);
      
      await this.db.execute(`
        INSERT IGNORE INTO users (
          username, email, first_name, last_name, password_hash, 
          role, is_active, email_verified
        ) VALUES (
          'admin', 'admin@sysme.local', 'System', 'Administrator', 
          ?, 'admin', true, true
        )
      `, [adminPassword]);
      
      // Default category
      await this.db.execute(`
        INSERT IGNORE INTO categories (name, description, sort_order, color) 
        VALUES ('General', 'Categoría general de productos', 1, '#6366f1')
      `);
      
      // System settings
      const defaultSettings = [
        ['app_name', 'SYSME 2.0', 'string', 'Application name'],
        ['currency', 'EUR', 'string', 'Default currency'],
        ['tax_rate', '21', 'number', 'Default tax rate percentage'],
        ['enable_stock_management', 'true', 'boolean', 'Enable stock management'],
        ['low_stock_threshold', '10', 'number', 'Low stock warning threshold'],
        ['invoice_prefix', 'INV', 'string', 'Invoice number prefix'],
        ['max_login_attempts', '5', 'number', 'Maximum login attempts before lockout'],
        ['session_timeout', '3600', 'number', 'Session timeout in seconds']
      ];
      
      for (const [key, value, type, desc] of defaultSettings) {
        await this.db.execute(`
          INSERT IGNORE INTO system_settings (key_name, value, data_type, description) 
          VALUES (?, ?, ?, ?)
        `, [key, value, type, desc]);
      }
      
      console.log('✅ Default data inserted');
      
    } catch (error) {
      console.error('❌ Default data insertion failed:', error.message);
      throw error;
    }
  }

  async createDatabaseUser() {
    if (CONFIG.ENV === 'production') {
      console.log('👤 Creating database user for production...');
      
      try {
        const dbUser = process.env.DB_USER || 'sysme_user';
        const dbPass = process.env.DB_PASS || 'secure_password_change_me';
        
        await this.db.execute(`
          CREATE USER IF NOT EXISTS '${dbUser}'@'localhost' IDENTIFIED BY ?
        `, [dbPass]);
        
        await this.db.execute(`
          GRANT SELECT, INSERT, UPDATE, DELETE ON ${CONFIG.DB.database}.* TO '${dbUser}'@'localhost'
        `);
        
        await this.db.execute(`FLUSH PRIVILEGES`);
        
        console.log(`✅ Database user '${dbUser}' created with limited privileges`);
        
      } catch (error) {
        console.error('❌ Database user creation failed:', error.message);
        throw error;
      }
    }
  }

  async verifySetup() {
    console.log('🧪 Verifying database setup...');
    
    try {
      // Check all tables exist
      const [tables] = await this.db.execute(`
        SELECT TABLE_NAME 
        FROM INFORMATION_SCHEMA.TABLES 
        WHERE TABLE_SCHEMA = ? 
        ORDER BY TABLE_NAME
      `, [CONFIG.DB.database]);
      
      console.log(`✅ Found ${tables.length} tables:`);
      tables.forEach(table => console.log(`   - ${table.TABLE_NAME}`));
      
      // Check default data
      const [userCount] = await this.db.execute('SELECT COUNT(*) as count FROM users');
      const [categoryCount] = await this.db.execute('SELECT COUNT(*) as count FROM categories');
      const [settingsCount] = await this.db.execute('SELECT COUNT(*) as count FROM system_settings');
      
      console.log(`✅ Default data verification:`);
      console.log(`   - Users: ${userCount[0].count}`);
      console.log(`   - Categories: ${categoryCount[0].count}`);
      console.log(`   - Settings: ${settingsCount[0].count}`);
      
      // Test basic operations
      await this.db.execute('SELECT 1 FROM users LIMIT 1');
      await this.db.execute('SELECT 1 FROM categories LIMIT 1');
      
      console.log('✅ Database setup verification completed successfully');
      
    } catch (error) {
      console.error('❌ Database verification failed:', error.message);
      throw error;
    }
  }

  async generateConnectionTest() {
    const testFile = path.join(__dirname, `test-db-connection-${CONFIG.ENV}.js`);
    
    const testScript = `
// Auto-generated database connection test
const mysql = require('mysql2/promise');

const config = {
  host: '${CONFIG.DB.host}',
  port: ${CONFIG.DB.port},
  user: '${process.env.DB_USER || 'sysme_user'}',
  password: process.env.DB_PASS,
  database: '${CONFIG.DB.database}'
};

async function testConnection() {
  try {
    console.log('🔌 Testing database connection...');
    const connection = await mysql.createConnection(config);
    
    const [result] = await connection.execute('SELECT COUNT(*) as count FROM users');
    console.log('✅ Connection successful!');
    console.log('📊 Users in database:', result[0].count);
    
    await connection.end();
    console.log('🎉 Database is ready for SYSME 2.0!');
    
  } catch (error) {
    console.error('❌ Connection failed:', error.message);
    process.exit(1);
  }
}

testConnection();
`;

    await fs.writeFile(testFile, testScript);
    console.log(`📝 Connection test script created: ${testFile}`);
  }

  async disconnect() {
    if (this.db) {
      await this.db.end();
      console.log('🔌 Database connection closed');
    }
  }

  async run() {
    const startTime = Date.now();
    
    try {
      console.log('🚀 Starting SYSME Modern Database Setup');
      console.log(`📍 Environment: ${CONFIG.ENV}`);
      console.log(`🗄️ Database: ${CONFIG.DB.database}`);
      console.log(`⚠️ Drop existing: ${CONFIG.DROP_EXISTING}`);
      
      await this.connect();
      await this.createDatabase();
      await this.createTables();
      await this.createIndexes();
      await this.insertDefaultData();
      
      if (CONFIG.ENV === 'production') {
        await this.createDatabaseUser();
      }
      
      await this.verifySetup();
      await this.generateConnectionTest();
      
      const duration = Math.round((Date.now() - startTime) / 1000);
      console.log(`\n🎉 Database setup completed successfully in ${duration}s!`);
      console.log('\n📋 Next steps:');
      console.log('   1. Review the default admin credentials');
      console.log('   2. Configure environment variables');
      console.log('   3. Run the connection test script');
      console.log('   4. Start the migration process');
      
    } catch (error) {
      console.error('💥 Database setup failed:', error.message);
      process.exit(1);
    } finally {
      await this.disconnect();
    }
  }
}

// Run setup if called directly
if (require.main === module) {
  const setup = new ModernDatabaseSetup();
  setup.run();
}

module.exports = ModernDatabaseSetup;
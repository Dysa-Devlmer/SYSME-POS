#!/usr/bin/env node

/**
 * SYSME Legacy Data Migration Script
 * Migrates data from legacy PHP system to modern Node.js architecture
 * 
 * Usage:
 *   node migrate-legacy-data.js [options]
 *   
 * Options:
 *   --dry-run    Show what would be migrated without making changes
 *   --target     Target environment (staging|production) - default: staging
 *   --batch-size Number of records to process at once - default: 100
 *   --verbose    Enable detailed logging
 */

const mysql = require('mysql2/promise');
const bcrypt = require('bcrypt');
const path = require('path');
const fs = require('fs').promises;

// Configuration
const CONFIG = {
  LEGACY_DB: {
    host: process.env.LEGACY_DB_HOST || 'localhost',
    port: process.env.LEGACY_DB_PORT || 4306,
    user: process.env.LEGACY_DB_USER || 'root',
    password: process.env.LEGACY_DB_PASS || '',
    database: process.env.LEGACY_DB_NAME || 'sysme'
  },
  MODERN_DB: {
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER || 'sysme_user',
    password: process.env.DB_PASS || '',
    database: process.env.DB_NAME || 'sysme_staging'
  },
  BATCH_SIZE: parseInt(process.env.MIGRATION_BATCH_SIZE || '100'),
  DRY_RUN: process.argv.includes('--dry-run'),
  VERBOSE: process.argv.includes('--verbose'),
  TARGET: process.argv.includes('--target=production') ? 'production' : 'staging'
};

class LegacyDataMigrator {
  constructor() {
    this.legacyDb = null;
    this.modernDb = null;
    this.migrationLog = [];
    this.stats = {
      users: { total: 0, migrated: 0, errors: 0 },
      categories: { total: 0, migrated: 0, errors: 0 },
      products: { total: 0, migrated: 0, errors: 0 },
      sales: { total: 0, migrated: 0, errors: 0 }
    };
  }

  async connect() {
    try {
      console.log('🔌 Connecting to databases...');
      
      // Connect to legacy database
      this.legacyDb = await mysql.createConnection(CONFIG.LEGACY_DB);
      await this.legacyDb.execute('SELECT 1');
      console.log('✅ Connected to legacy database');
      
      // Connect to modern database
      this.modernDb = await mysql.createConnection(CONFIG.MODERN_DB);
      await this.modernDb.execute('SELECT 1');
      console.log('✅ Connected to modern database');
      
    } catch (error) {
      console.error('❌ Database connection failed:', error.message);
      throw error;
    }
  }

  async disconnect() {
    if (this.legacyDb) await this.legacyDb.end();
    if (this.modernDb) await this.modernDb.end();
    console.log('🔌 Database connections closed');
  }

  log(message, type = 'info') {
    const timestamp = new Date().toISOString();
    const logEntry = { timestamp, type, message };
    this.migrationLog.push(logEntry);
    
    const prefix = type === 'error' ? '❌' : type === 'warn' ? '⚠️' : 'ℹ️';
    if (CONFIG.VERBOSE || type === 'error') {
      console.log(`${prefix} [${timestamp}] ${message}`);
    }
  }

  async migrateUsers() {
    console.log('\n👥 Migrating users...');
    
    try {
      // Get legacy users
      const [legacyUsers] = await this.legacyDb.execute(`
        SELECT 
          id_usuario as id,
          usuario as username,
          nombre as first_name,
          apellido as last_name,
          email,
          clave as password_hash,
          nivel as role_level,
          activo as is_active,
          fecha_creacion as created_at,
          fecha_modificacion as updated_at
        FROM usuario 
        WHERE activo = 'S'
        ORDER BY id_usuario
      `);

      this.stats.users.total = legacyUsers.length;
      console.log(`📊 Found ${legacyUsers.length} legacy users to migrate`);

      if (CONFIG.DRY_RUN) {
        console.log('🔍 DRY RUN: Would migrate users:', legacyUsers.slice(0, 3));
        return;
      }

      // Process in batches
      for (let i = 0; i < legacyUsers.length; i += CONFIG.BATCH_SIZE) {
        const batch = legacyUsers.slice(i, i + CONFIG.BATCH_SIZE);
        
        for (const user of batch) {
          try {
            // Map legacy role to modern role
            const roleMap = {
              1: 'admin',
              2: 'manager', 
              3: 'cashier',
              4: 'user'
            };
            const role = roleMap[user.role_level] || 'user';

            // Hash password if it's not already hashed
            let passwordHash = user.password_hash;
            if (passwordHash && !passwordHash.startsWith('$2')) {
              passwordHash = await bcrypt.hash(passwordHash, 12);
            }

            // Insert into modern database
            await this.modernDb.execute(`
              INSERT IGNORE INTO users (
                legacy_id, username, email, first_name, last_name,
                password_hash, role, is_active, email_verified,
                created_at, updated_at
              ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `, [
              user.id,
              user.username,
              user.email || `${user.username}@sysme.local`,
              user.first_name || '',
              user.last_name || '',
              passwordHash,
              role,
              user.is_active === 'S',
              false, // Will need email verification
              user.created_at || new Date(),
              user.updated_at || new Date()
            ]);

            this.stats.users.migrated++;
            this.log(`Migrated user: ${user.username}`, 'info');

          } catch (error) {
            this.stats.users.errors++;
            this.log(`Error migrating user ${user.username}: ${error.message}`, 'error');
          }
        }

        // Progress update
        console.log(`📈 Users progress: ${Math.min(i + CONFIG.BATCH_SIZE, legacyUsers.length)}/${legacyUsers.length}`);
      }

      console.log(`✅ Users migration completed: ${this.stats.users.migrated}/${this.stats.users.total} successful`);

    } catch (error) {
      console.error('❌ Users migration failed:', error.message);
      throw error;
    }
  }

  async migrateCategories() {
    console.log('\n📂 Migrating categories...');
    
    try {
      // Get legacy categories
      const [legacyCategories] = await this.legacyDb.execute(`
        SELECT 
          id_categoria as id,
          nombre as name,
          descripcion as description,
          orden as sort_order,
          activo as is_active,
          color,
          imagen as image_path,
          fecha_creacion as created_at,
          fecha_modificacion as updated_at
        FROM categorias 
        WHERE activo = 'S'
        ORDER BY orden, nombre
      `);

      this.stats.categories.total = legacyCategories.length;
      console.log(`📊 Found ${legacyCategories.length} legacy categories to migrate`);

      if (CONFIG.DRY_RUN) {
        console.log('🔍 DRY RUN: Would migrate categories:', legacyCategories.slice(0, 3));
        return;
      }

      for (const category of legacyCategories) {
        try {
          // Process image path
          let imageUrl = null;
          if (category.image_path) {
            imageUrl = `/uploads/categories/${path.basename(category.image_path)}`;
          }

          await this.modernDb.execute(`
            INSERT IGNORE INTO categories (
              legacy_id, name, description, sort_order, 
              is_active, color, image_url, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
          `, [
            category.id,
            category.name,
            category.description || '',
            category.sort_order || 0,
            category.is_active === 'S',
            category.color || '#6366f1',
            imageUrl,
            category.created_at || new Date(),
            category.updated_at || new Date()
          ]);

          this.stats.categories.migrated++;
          this.log(`Migrated category: ${category.name}`, 'info');

        } catch (error) {
          this.stats.categories.errors++;
          this.log(`Error migrating category ${category.name}: ${error.message}`, 'error');
        }
      }

      console.log(`✅ Categories migration completed: ${this.stats.categories.migrated}/${this.stats.categories.total} successful`);

    } catch (error) {
      console.error('❌ Categories migration failed:', error.message);
      throw error;
    }
  }

  async migrateProducts() {
    console.log('\n🛍️ Migrating products...');
    
    try {
      // Get legacy products with category info
      const [legacyProducts] = await this.legacyDb.execute(`
        SELECT 
          p.id_producto as id,
          p.nombre as name,
          p.descripcion as description,
          p.precio as price,
          p.stock,
          p.stock_minimo as min_stock,
          p.id_categoria as category_id,
          p.imagen as image_path,
          p.activo as is_active,
          p.ingredientes as ingredients,
          p.alergenos as allergens,
          p.fecha_creacion as created_at,
          p.fecha_modificacion as updated_at,
          c.id_categoria as legacy_category_id
        FROM productos p
        LEFT JOIN categorias c ON p.id_categoria = c.id_categoria
        WHERE p.activo = 'S'
        ORDER BY p.nombre
      `);

      this.stats.products.total = legacyProducts.length;
      console.log(`📊 Found ${legacyProducts.length} legacy products to migrate`);

      if (CONFIG.DRY_RUN) {
        console.log('🔍 DRY RUN: Would migrate products:', legacyProducts.slice(0, 3));
        return;
      }

      // Get modern category mapping
      const [modernCategories] = await this.modernDb.execute(`
        SELECT id, legacy_id FROM categories WHERE legacy_id IS NOT NULL
      `);
      const categoryMap = new Map();
      modernCategories.forEach(cat => categoryMap.set(cat.legacy_id, cat.id));

      // Process in batches
      for (let i = 0; i < legacyProducts.length; i += CONFIG.BATCH_SIZE) {
        const batch = legacyProducts.slice(i, i + CONFIG.BATCH_SIZE);
        
        for (const product of batch) {
          try {
            // Map category
            const modernCategoryId = categoryMap.get(product.category_id) || null;
            if (!modernCategoryId) {
              this.log(`Warning: No modern category found for legacy category ${product.category_id}`, 'warn');
            }

            // Process image
            let imageUrl = null;
            if (product.image_path) {
              imageUrl = `/uploads/products/${path.basename(product.image_path)}`;
            }

            // Determine stock status
            let stockStatus = 'in_stock';
            if (product.stock === 0) {
              stockStatus = 'out_of_stock';
            } else if (product.stock <= product.min_stock) {
              stockStatus = 'low_stock';
            }

            // Parse ingredients and allergens
            const ingredients = product.ingredients ? product.ingredients.split(',').map(i => i.trim()) : [];
            const allergens = product.allergens ? product.allergens.split(',').map(a => a.trim()) : [];

            await this.modernDb.execute(`
              INSERT IGNORE INTO products (
                legacy_id, name, description, price, stock, min_stock,
                category_id, image_url, is_active, stock_status,
                ingredients, allergens, created_at, updated_at
              ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `, [
              product.id,
              product.name,
              product.description || '',
              product.price || 0,
              product.stock || 0,
              product.min_stock || 0,
              modernCategoryId,
              imageUrl,
              product.is_active === 'S',
              stockStatus,
              JSON.stringify(ingredients),
              JSON.stringify(allergens),
              product.created_at || new Date(),
              product.updated_at || new Date()
            ]);

            this.stats.products.migrated++;
            this.log(`Migrated product: ${product.name}`, 'info');

          } catch (error) {
            this.stats.products.errors++;
            this.log(`Error migrating product ${product.name}: ${error.message}`, 'error');
          }
        }

        // Progress update
        console.log(`📈 Products progress: ${Math.min(i + CONFIG.BATCH_SIZE, legacyProducts.length)}/${legacyProducts.length}`);
      }

      console.log(`✅ Products migration completed: ${this.stats.products.migrated}/${this.stats.products.total} successful`);

    } catch (error) {
      console.error('❌ Products migration failed:', error.message);
      throw error;
    }
  }

  async migrateSales() {
    console.log('\n💰 Migrating sales data...');
    
    try {
      // Get legacy sales with details
      const [legacySales] = await this.legacyDb.execute(`
        SELECT 
          v.id_venta as id,
          v.numero_factura as invoice_number,
          v.fecha as sale_date,
          v.total,
          v.descuento as discount,
          v.impuesto as tax,
          v.id_usuario as user_id,
          v.metodo_pago as payment_method,
          v.estado as status,
          v.observaciones as notes,
          v.fecha_creacion as created_at
        FROM ventas v
        WHERE v.fecha >= DATE_SUB(NOW(), INTERVAL 1 YEAR) -- Only last year
        ORDER BY v.fecha DESC
        LIMIT 10000 -- Limit to avoid memory issues
      `);

      this.stats.sales.total = legacySales.length;
      console.log(`📊 Found ${legacySales.length} legacy sales to migrate`);

      if (CONFIG.DRY_RUN) {
        console.log('🔍 DRY RUN: Would migrate sales:', legacySales.slice(0, 3));
        return;
      }

      // Get user mapping
      const [modernUsers] = await this.modernDb.execute(`
        SELECT id, legacy_id FROM users WHERE legacy_id IS NOT NULL
      `);
      const userMap = new Map();
      modernUsers.forEach(user => userMap.set(user.legacy_id, user.id));

      // Process in batches
      for (let i = 0; i < legacySales.length; i += CONFIG.BATCH_SIZE) {
        const batch = legacySales.slice(i, i + CONFIG.BATCH_SIZE);
        
        for (const sale of batch) {
          try {
            // Map user
            const modernUserId = userMap.get(sale.user_id) || null;

            // Map payment method
            const paymentMethodMap = {
              'efectivo': 'cash',
              'tarjeta': 'card',
              'transferencia': 'transfer'
            };
            const paymentMethod = paymentMethodMap[sale.payment_method] || 'cash';

            // Map status
            const statusMap = {
              'completada': 'completed',
              'pendiente': 'pending',
              'cancelada': 'cancelled'
            };
            const status = statusMap[sale.status] || 'completed';

            // Insert sale
            const [result] = await this.modernDb.execute(`
              INSERT IGNORE INTO sales (
                legacy_id, invoice_number, sale_date, subtotal, discount,
                tax, total, user_id, payment_method, status, notes, created_at
              ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `, [
              sale.id,
              sale.invoice_number,
              sale.sale_date,
              sale.total - (sale.discount || 0) - (sale.tax || 0), // Calculate subtotal
              sale.discount || 0,
              sale.tax || 0,
              sale.total,
              modernUserId,
              paymentMethod,
              status,
              sale.notes || '',
              sale.created_at || new Date()
            ]);

            // If sale was inserted, migrate sale items
            if (result.insertId) {
              await this.migrateSaleItems(sale.id, result.insertId);
            }

            this.stats.sales.migrated++;
            this.log(`Migrated sale: ${sale.invoice_number}`, 'info');

          } catch (error) {
            this.stats.sales.errors++;
            this.log(`Error migrating sale ${sale.invoice_number}: ${error.message}`, 'error');
          }
        }

        // Progress update
        console.log(`📈 Sales progress: ${Math.min(i + CONFIG.BATCH_SIZE, legacySales.length)}/${legacySales.length}`);
      }

      console.log(`✅ Sales migration completed: ${this.stats.sales.migrated}/${this.stats.sales.total} successful`);

    } catch (error) {
      console.error('❌ Sales migration failed:', error.message);
      throw error;
    }
  }

  async migrateSaleItems(legacySaleId, modernSaleId) {
    try {
      // Get sale items
      const [saleItems] = await this.legacyDb.execute(`
        SELECT 
          id_producto as product_id,
          cantidad as quantity,
          precio_unitario as unit_price,
          subtotal
        FROM detalle_venta
        WHERE id_venta = ?
      `, [legacySaleId]);

      // Get product mapping
      const [modernProducts] = await this.modernDb.execute(`
        SELECT id, legacy_id FROM products WHERE legacy_id IS NOT NULL
      `);
      const productMap = new Map();
      modernProducts.forEach(prod => productMap.set(prod.legacy_id, prod.id));

      for (const item of saleItems) {
        const modernProductId = productMap.get(item.product_id);
        if (modernProductId) {
          await this.modernDb.execute(`
            INSERT IGNORE INTO sale_items (
              sale_id, product_id, quantity, unit_price, subtotal
            ) VALUES (?, ?, ?, ?, ?)
          `, [
            modernSaleId,
            modernProductId,
            item.quantity,
            item.unit_price,
            item.subtotal || (item.quantity * item.unit_price)
          ]);
        }
      }

    } catch (error) {
      this.log(`Error migrating sale items for sale ${legacySaleId}: ${error.message}`, 'error');
    }
  }

  async generateReport() {
    const reportPath = path.join(__dirname, '../logs', `migration-report-${Date.now()}.json`);
    
    const report = {
      timestamp: new Date().toISOString(),
      configuration: {
        target: CONFIG.TARGET,
        dryRun: CONFIG.DRY_RUN,
        batchSize: CONFIG.BATCH_SIZE
      },
      statistics: this.stats,
      log: this.migrationLog
    };

    await fs.writeFile(reportPath, JSON.stringify(report, null, 2));
    console.log(`📊 Migration report saved: ${reportPath}`);
    
    return report;
  }

  async run() {
    const startTime = Date.now();
    
    try {
      console.log('🚀 Starting SYSME Legacy Data Migration');
      console.log(`📍 Target: ${CONFIG.TARGET}`);
      console.log(`📋 Dry run: ${CONFIG.DRY_RUN}`);
      console.log(`📦 Batch size: ${CONFIG.BATCH_SIZE}`);
      
      await this.connect();

      // Run migrations in order
      await this.migrateUsers();
      await this.migrateCategories();
      await this.migrateProducts();
      await this.migrateSales();

      const duration = Math.round((Date.now() - startTime) / 1000);
      console.log(`\n🎉 Migration completed in ${duration}s`);
      
      // Print final statistics
      console.log('\n📊 Final Statistics:');
      Object.entries(this.stats).forEach(([entity, stats]) => {
        console.log(`  ${entity}: ${stats.migrated}/${stats.total} migrated (${stats.errors} errors)`);
      });

      await this.generateReport();

    } catch (error) {
      console.error('💥 Migration failed:', error.message);
      throw error;
    } finally {
      await this.disconnect();
    }
  }
}

// Run migration if called directly
if (require.main === module) {
  const migrator = new LegacyDataMigrator();
  migrator.run().catch(error => {
    console.error('💥 Migration process failed:', error);
    process.exit(1);
  });
}

module.exports = LegacyDataMigrator;
#!/usr/bin/env node

/**
 * SYSME Migration Validation Script
 * Validates data integrity after migration from legacy system
 * 
 * Usage:
 *   node validate-migration.js --source=legacy --target=staging
 *   node validate-migration.js --source=legacy --target=production --detailed
 */

const mysql = require('mysql2/promise');
const fs = require('fs').promises;
const path = require('path');

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
  DETAILED: process.argv.includes('--detailed'),
  TARGET: process.argv.includes('--target=production') ? 'production' : 'staging'
};

class MigrationValidator {
  constructor() {
    this.legacyDb = null;
    this.modernDb = null;
    this.validationResults = {
      users: { status: 'pending', issues: [], stats: {} },
      categories: { status: 'pending', issues: [], stats: {} },
      products: { status: 'pending', issues: [], stats: {} },
      sales: { status: 'pending', issues: [], stats: {} },
      overall: { status: 'pending', criticalIssues: 0, warnings: 0 }
    };
  }

  async connect() {
    try {
      console.log('🔌 Connecting to databases...');
      
      this.legacyDb = await mysql.createConnection(CONFIG.LEGACY_DB);
      await this.legacyDb.execute('SELECT 1');
      console.log('✅ Connected to legacy database');
      
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
  }

  logIssue(entity, type, message, severity = 'warning') {
    const issue = { type, message, severity };
    this.validationResults[entity].issues.push(issue);
    
    const icon = severity === 'critical' ? '🚨' : '⚠️';
    console.log(`${icon} [${entity.toUpperCase()}] ${message}`);
    
    if (severity === 'critical') {
      this.validationResults.overall.criticalIssues++;
    } else {
      this.validationResults.overall.warnings++;
    }
  }

  async validateUsers() {
    console.log('\n👥 Validating users migration...');
    
    try {
      // Count comparison
      const [legacyCount] = await this.legacyDb.execute(
        'SELECT COUNT(*) as count FROM usuario WHERE activo = "S"'
      );
      const [modernCount] = await this.modernDb.execute(
        'SELECT COUNT(*) as count FROM users WHERE legacy_id IS NOT NULL'
      );
      
      const legacyTotal = legacyCount[0].count;
      const modernTotal = modernCount[0].count;
      
      this.validationResults.users.stats = {
        legacy_count: legacyTotal,
        modern_count: modernTotal,
        migration_rate: modernTotal / legacyTotal
      };

      if (modernTotal < legacyTotal) {
        this.logIssue('users', 'count_mismatch', 
          `Missing users: ${legacyTotal - modernTotal} users not migrated`, 'critical');
      }

      // Check for duplicate usernames
      const [duplicates] = await this.modernDb.execute(`
        SELECT username, COUNT(*) as count 
        FROM users 
        GROUP BY username 
        HAVING count > 1
      `);
      
      if (duplicates.length > 0) {
        this.logIssue('users', 'duplicates', 
          `Found ${duplicates.length} duplicate usernames`, 'critical');
        
        if (CONFIG.DETAILED) {
          duplicates.forEach(dup => {
            console.log(`   - Duplicate username: ${dup.username} (${dup.count} times)`);
          });
        }
      }

      // Check for missing email verification
      const [unverifiedEmails] = await this.modernDb.execute(
        'SELECT COUNT(*) as count FROM users WHERE email_verified = false AND legacy_id IS NOT NULL'
      );
      
      if (unverifiedEmails[0].count > 0) {
        this.logIssue('users', 'email_verification', 
          `${unverifiedEmails[0].count} migrated users need email verification`, 'warning');
      }

      // Sample data integrity check
      if (CONFIG.DETAILED) {
        const [sampleUsers] = await this.legacyDb.execute(`
          SELECT id_usuario, usuario, nombre, apellido 
          FROM usuario WHERE activo = 'S' LIMIT 5
        `);
        
        for (const legacyUser of sampleUsers) {
          const [modernUser] = await this.modernDb.execute(
            'SELECT username, first_name, last_name FROM users WHERE legacy_id = ?',
            [legacyUser.id_usuario]
          );
          
          if (modernUser.length === 0) {
            this.logIssue('users', 'missing_user', 
              `Legacy user ${legacyUser.usuario} not found in modern DB`, 'critical');
          } else if (modernUser[0].username !== legacyUser.usuario) {
            this.logIssue('users', 'data_mismatch', 
              `Username mismatch for user ID ${legacyUser.id_usuario}`, 'warning');
          }
        }
      }

      this.validationResults.users.status = 
        this.validationResults.users.issues.filter(i => i.severity === 'critical').length === 0 
          ? 'passed' : 'failed';

      console.log(`✅ Users validation: ${modernTotal}/${legacyTotal} migrated`);

    } catch (error) {
      this.validationResults.users.status = 'error';
      console.error('❌ Users validation failed:', error.message);
    }
  }

  async validateCategories() {
    console.log('\n📂 Validating categories migration...');
    
    try {
      // Count comparison
      const [legacyCount] = await this.legacyDb.execute(
        'SELECT COUNT(*) as count FROM categorias WHERE activo = "S"'
      );
      const [modernCount] = await this.modernDb.execute(
        'SELECT COUNT(*) as count FROM categories WHERE legacy_id IS NOT NULL'
      );
      
      const legacyTotal = legacyCount[0].count;
      const modernTotal = modernCount[0].count;
      
      this.validationResults.categories.stats = {
        legacy_count: legacyTotal,
        modern_count: modernTotal,
        migration_rate: modernTotal / legacyTotal
      };

      if (modernTotal !== legacyTotal) {
        this.logIssue('categories', 'count_mismatch', 
          `Categories count mismatch: ${legacyTotal} → ${modernTotal}`, 'critical');
      }

      // Check sort order integrity
      const [sortOrderIssues] = await this.modernDb.execute(`
        SELECT COUNT(*) as count FROM categories 
        WHERE sort_order IS NULL OR sort_order < 0
      `);
      
      if (sortOrderIssues[0].count > 0) {
        this.logIssue('categories', 'sort_order', 
          `${sortOrderIssues[0].count} categories have invalid sort order`, 'warning');
      }

      // Check for missing product relationships
      if (CONFIG.DETAILED) {
        const [orphanedProducts] = await this.modernDb.execute(`
          SELECT COUNT(*) as count FROM products p
          LEFT JOIN categories c ON p.category_id = c.id
          WHERE c.id IS NULL AND p.legacy_id IS NOT NULL
        `);
        
        if (orphanedProducts[0].count > 0) {
          this.logIssue('categories', 'orphaned_products', 
            `${orphanedProducts[0].count} products have no valid category`, 'critical');
        }
      }

      this.validationResults.categories.status = 
        this.validationResults.categories.issues.filter(i => i.severity === 'critical').length === 0 
          ? 'passed' : 'failed';

      console.log(`✅ Categories validation: ${modernTotal}/${legacyTotal} migrated`);

    } catch (error) {
      this.validationResults.categories.status = 'error';
      console.error('❌ Categories validation failed:', error.message);
    }
  }

  async validateProducts() {
    console.log('\n🛍️ Validating products migration...');
    
    try {
      // Count comparison
      const [legacyCount] = await this.legacyDb.execute(
        'SELECT COUNT(*) as count FROM productos WHERE activo = "S"'
      );
      const [modernCount] = await this.modernDb.execute(
        'SELECT COUNT(*) as count FROM products WHERE legacy_id IS NOT NULL'
      );
      
      const legacyTotal = legacyCount[0].count;
      const modernTotal = modernCount[0].count;
      
      this.validationResults.products.stats = {
        legacy_count: legacyTotal,
        modern_count: modernTotal,
        migration_rate: modernTotal / legacyTotal
      };

      if (modernTotal < legacyTotal * 0.95) { // Allow 5% tolerance
        this.logIssue('products', 'count_mismatch', 
          `Significant product loss: ${legacyTotal} → ${modernTotal}`, 'critical');
      }

      // Check price integrity
      const [priceIssues] = await this.modernDb.execute(`
        SELECT COUNT(*) as count FROM products 
        WHERE price IS NULL OR price < 0
      `);
      
      if (priceIssues[0].count > 0) {
        this.logIssue('products', 'price_issues', 
          `${priceIssues[0].count} products have invalid prices`, 'critical');
      }

      // Check stock status consistency
      const [stockInconsistency] = await this.modernDb.execute(`
        SELECT COUNT(*) as count FROM products 
        WHERE (stock = 0 AND stock_status != 'out_of_stock') 
           OR (stock > min_stock AND stock_status = 'low_stock')
           OR (stock <= min_stock AND stock > 0 AND stock_status != 'low_stock')
      `);
      
      if (stockInconsistency[0].count > 0) {
        this.logIssue('products', 'stock_inconsistency', 
          `${stockInconsistency[0].count} products have inconsistent stock status`, 'warning');
      }

      // Validate JSON fields (ingredients, allergens)
      const [invalidJson] = await this.modernDb.execute(`
        SELECT id, name FROM products 
        WHERE legacy_id IS NOT NULL 
        AND (
          (ingredients IS NOT NULL AND ingredients != '' AND JSON_VALID(ingredients) = 0)
          OR 
          (allergens IS NOT NULL AND allergens != '' AND JSON_VALID(allergens) = 0)
        )
      `);
      
      if (invalidJson.length > 0) {
        this.logIssue('products', 'invalid_json', 
          `${invalidJson.length} products have invalid JSON in ingredients/allergens`, 'warning');
        
        if (CONFIG.DETAILED) {
          invalidJson.forEach(prod => {
            console.log(`   - Invalid JSON in product: ${prod.name} (ID: ${prod.id})`);
          });
        }
      }

      // Sample price comparison
      if (CONFIG.DETAILED) {
        const [priceComparison] = await this.legacyDb.execute(`
          SELECT 
            p.id_producto as legacy_id,
            p.precio as legacy_price,
            m.price as modern_price,
            p.nombre as name
          FROM productos p
          JOIN ${CONFIG.MODERN_DB.database}.products m ON m.legacy_id = p.id_producto
          WHERE p.activo = 'S' AND ABS(p.precio - m.price) > 0.01
          LIMIT 10
        `);
        
        if (priceComparison.length > 0) {
          this.logIssue('products', 'price_differences', 
            `${priceComparison.length} products have price differences`, 'warning');
          
          priceComparison.forEach(prod => {
            console.log(`   - ${prod.name}: ${prod.legacy_price} → ${prod.modern_price}`);
          });
        }
      }

      this.validationResults.products.status = 
        this.validationResults.products.issues.filter(i => i.severity === 'critical').length === 0 
          ? 'passed' : 'failed';

      console.log(`✅ Products validation: ${modernTotal}/${legacyTotal} migrated`);

    } catch (error) {
      this.validationResults.products.status = 'error';
      console.error('❌ Products validation failed:', error.message);
    }
  }

  async validateSales() {
    console.log('\n💰 Validating sales migration...');
    
    try {
      // Count comparison (last year only)
      const [legacyCount] = await this.legacyDb.execute(`
        SELECT COUNT(*) as count FROM ventas 
        WHERE fecha >= DATE_SUB(NOW(), INTERVAL 1 YEAR)
      `);
      const [modernCount] = await this.modernDb.execute(
        'SELECT COUNT(*) as count FROM sales WHERE legacy_id IS NOT NULL'
      );
      
      const legacyTotal = legacyCount[0].count;
      const modernTotal = modernCount[0].count;
      
      this.validationResults.sales.stats = {
        legacy_count: legacyTotal,
        modern_count: modernTotal,
        migration_rate: modernTotal / legacyTotal
      };

      if (modernTotal < legacyTotal * 0.9) { // Allow 10% tolerance for sales
        this.logIssue('sales', 'count_mismatch', 
          `Significant sales loss: ${legacyTotal} → ${modernTotal}`, 'critical');
      }

      // Check total amount integrity
      const [amountComparison] = await this.legacyDb.execute(`
        SELECT 
          ROUND(SUM(v.total), 2) as legacy_total
        FROM ventas v
        WHERE v.fecha >= DATE_SUB(NOW(), INTERVAL 1 YEAR)
      `);
      
      const [modernAmountComparison] = await this.modernDb.execute(`
        SELECT 
          ROUND(SUM(s.total), 2) as modern_total
        FROM sales s
        WHERE s.legacy_id IS NOT NULL
      `);
      
      const legacyAmount = amountComparison[0].legacy_total || 0;
      const modernAmount = modernAmountComparison[0].modern_total || 0;
      const amountDifference = Math.abs(legacyAmount - modernAmount);
      const amountDifferencePercentage = legacyAmount > 0 ? (amountDifference / legacyAmount) * 100 : 0;
      
      this.validationResults.sales.stats.legacy_amount = legacyAmount;
      this.validationResults.sales.stats.modern_amount = modernAmount;
      this.validationResults.sales.stats.amount_difference = amountDifference;
      this.validationResults.sales.stats.amount_difference_percentage = amountDifferencePercentage;

      if (amountDifferencePercentage > 5) { // More than 5% difference
        this.logIssue('sales', 'amount_mismatch', 
          `Sales amount mismatch: ${amountDifferencePercentage.toFixed(2)}% difference (${amountDifference})`, 'critical');
      }

      // Check for sales without items
      const [salesWithoutItems] = await this.modernDb.execute(`
        SELECT COUNT(*) as count FROM sales s
        LEFT JOIN sale_items si ON s.id = si.sale_id
        WHERE s.legacy_id IS NOT NULL AND si.id IS NULL
      `);
      
      if (salesWithoutItems[0].count > 0) {
        this.logIssue('sales', 'missing_items', 
          `${salesWithoutItems[0].count} sales have no items`, 'critical');
      }

      // Check for invalid totals
      const [invalidTotals] = await this.modernDb.execute(`
        SELECT COUNT(*) as count FROM sales 
        WHERE legacy_id IS NOT NULL AND (total IS NULL OR total < 0)
      `);
      
      if (invalidTotals[0].count > 0) {
        this.logIssue('sales', 'invalid_totals', 
          `${invalidTotals[0].count} sales have invalid totals`, 'critical');
      }

      this.validationResults.sales.status = 
        this.validationResults.sales.issues.filter(i => i.severity === 'critical').length === 0 
          ? 'passed' : 'failed';

      console.log(`✅ Sales validation: ${modernTotal}/${legacyTotal} migrated`);
      console.log(`💰 Amount validation: $${modernAmount} / $${legacyAmount} (${amountDifferencePercentage.toFixed(2)}% diff)`);

    } catch (error) {
      this.validationResults.sales.status = 'error';
      console.error('❌ Sales validation failed:', error.message);
    }
  }

  async performIntegrityChecks() {
    console.log('\n🔍 Performing integrity checks...');
    
    try {
      // Check referential integrity
      const [orphanedProducts] = await this.modernDb.execute(`
        SELECT COUNT(*) as count FROM products p
        LEFT JOIN categories c ON p.category_id = c.id
        WHERE p.legacy_id IS NOT NULL AND c.id IS NULL
      `);
      
      if (orphanedProducts[0].count > 0) {
        this.logIssue('overall', 'referential_integrity', 
          `${orphanedProducts[0].count} products reference non-existent categories`, 'critical');
      }

      // Check for duplicate legacy IDs
      const entities = ['users', 'categories', 'products', 'sales'];
      for (const entity of entities) {
        const [duplicateLegacyIds] = await this.modernDb.execute(`
          SELECT legacy_id, COUNT(*) as count 
          FROM ${entity} 
          WHERE legacy_id IS NOT NULL 
          GROUP BY legacy_id 
          HAVING count > 1
        `);
        
        if (duplicateLegacyIds.length > 0) {
          this.logIssue('overall', 'duplicate_legacy_ids', 
            `${duplicateLegacyIds.length} duplicate legacy IDs in ${entity}`, 'critical');
        }
      }

      // Check data encoding issues
      const [encodingIssues] = await this.modernDb.execute(`
        SELECT 
          'products' as table_name, id, name as field_value
        FROM products 
        WHERE name LIKE '%�%' OR description LIKE '%�%'
        UNION ALL
        SELECT 
          'categories' as table_name, id, name as field_value
        FROM categories 
        WHERE name LIKE '%�%' OR description LIKE '%�%'
        LIMIT 10
      `);
      
      if (encodingIssues.length > 0) {
        this.logIssue('overall', 'encoding_issues', 
          `${encodingIssues.length} records have encoding issues`, 'warning');
        
        if (CONFIG.DETAILED) {
          encodingIssues.forEach(issue => {
            console.log(`   - ${issue.table_name} ID ${issue.id}: ${issue.field_value}`);
          });
        }
      }

    } catch (error) {
      console.error('❌ Integrity checks failed:', error.message);
    }
  }

  async generateReport() {
    const reportPath = path.join(__dirname, '../logs', `validation-report-${Date.now()}.json`);
    
    // Determine overall status
    const criticalIssues = this.validationResults.overall.criticalIssues;
    const allEntityStatus = Object.keys(this.validationResults)
      .filter(k => k !== 'overall')
      .map(k => this.validationResults[k].status);
    
    this.validationResults.overall.status = criticalIssues === 0 && !allEntityStatus.includes('failed') 
      ? 'passed' 
      : 'failed';

    const report = {
      timestamp: new Date().toISOString(),
      configuration: {
        target: CONFIG.TARGET,
        detailed: CONFIG.DETAILED,
        legacy_db: `${CONFIG.LEGACY_DB.host}:${CONFIG.LEGACY_DB.port}/${CONFIG.LEGACY_DB.database}`,
        modern_db: `${CONFIG.MODERN_DB.host}:${CONFIG.MODERN_DB.port}/${CONFIG.MODERN_DB.database}`
      },
      validation_results: this.validationResults
    };

    await fs.writeFile(reportPath, JSON.stringify(report, null, 2));
    console.log(`📊 Validation report saved: ${reportPath}`);
    
    return report;
  }

  printSummary() {
    console.log('\n📊 VALIDATION SUMMARY');
    console.log('='.repeat(50));
    
    const entities = ['users', 'categories', 'products', 'sales'];
    entities.forEach(entity => {
      const result = this.validationResults[entity];
      const icon = result.status === 'passed' ? '✅' : 
                   result.status === 'failed' ? '❌' : '⚠️';
      
      console.log(`${icon} ${entity.toUpperCase()}: ${result.status}`);
      
      if (result.stats.legacy_count !== undefined) {
        console.log(`   Migration rate: ${result.stats.modern_count}/${result.stats.legacy_count} (${(result.stats.migration_rate * 100).toFixed(1)}%)`);
      }
      
      const criticalIssues = result.issues.filter(i => i.severity === 'critical').length;
      const warnings = result.issues.filter(i => i.severity === 'warning').length;
      
      if (criticalIssues > 0) console.log(`   🚨 Critical issues: ${criticalIssues}`);
      if (warnings > 0) console.log(`   ⚠️ Warnings: ${warnings}`);
    });

    console.log('\n' + '='.repeat(50));
    console.log(`🎯 OVERALL: ${this.validationResults.overall.status.toUpperCase()}`);
    console.log(`🚨 Critical issues: ${this.validationResults.overall.criticalIssues}`);
    console.log(`⚠️ Warnings: ${this.validationResults.overall.warnings}`);
    
    if (this.validationResults.overall.status === 'passed') {
      console.log('\n🎉 Migration validation PASSED! Data integrity confirmed.');
    } else {
      console.log('\n💥 Migration validation FAILED! Critical issues need attention.');
    }
  }

  async run() {
    const startTime = Date.now();
    
    try {
      console.log('🔍 Starting SYSME Migration Validation');
      console.log(`📍 Target: ${CONFIG.TARGET}`);
      console.log(`📋 Detailed: ${CONFIG.DETAILED}`);
      
      await this.connect();

      // Run all validations
      await this.validateUsers();
      await this.validateCategories();
      await this.validateProducts();
      await this.validateSales();
      await this.performIntegrityChecks();

      const duration = Math.round((Date.now() - startTime) / 1000);
      console.log(`\n⏱️ Validation completed in ${duration}s`);
      
      this.printSummary();
      await this.generateReport();

      // Exit with appropriate code
      process.exit(this.validationResults.overall.status === 'passed' ? 0 : 1);

    } catch (error) {
      console.error('💥 Validation failed:', error.message);
      process.exit(1);
    } finally {
      await this.disconnect();
    }
  }
}

// Run validation if called directly
if (require.main === module) {
  const validator = new MigrationValidator();
  validator.run();
}

module.exports = MigrationValidator;
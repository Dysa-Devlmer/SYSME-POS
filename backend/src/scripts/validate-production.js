/**
 * Production Validation Script
 * Validates that SYSME is ready for 100% production deployment
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import knex from 'knex';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.join(__dirname, '../..');

// Load production environment
const envPath = path.join(rootDir, '.env.production');
if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath });
}

class ProductionValidator {
  constructor() {
    this.checks = [];
    this.warnings = [];
    this.errors = [];
  }

  log(level, category, message, details = null) {
    const entry = {
      level,
      category,
      message,
      details,
      timestamp: new Date().toISOString()
    };

    if (level === 'error') {
      this.errors.push(entry);
      console.error(`❌ [${category}] ${message}`);
      if (details) console.error(`   Details: ${details}`);
    } else if (level === 'warning') {
      this.warnings.push(entry);
      console.warn(`⚠️  [${category}] ${message}`);
      if (details) console.warn(`   Details: ${details}`);
    } else {
      this.checks.push(entry);
      console.log(`✅ [${category}] ${message}`);
      if (details) console.log(`   Details: ${details}`);
    }
  }

  // File and directory structure validation
  async validateFileStructure() {
    console.log('\\n📁 Validating File Structure...');

    const requiredFiles = [
      { path: 'src/server.js', type: 'file', critical: true },
      { path: 'src/config/database.js', type: 'file', critical: true },
      { path: 'src/middleware/security.js', type: 'file', critical: true },
      { path: 'src/scripts/setup-production.js', type: 'file', critical: true },
      { path: 'src/scripts/migrate-to-mysql.js', type: 'file', critical: true },
      { path: 'src/scripts/backup-database.js', type: 'file', critical: true },
      { path: 'package.json', type: 'file', critical: true },
      { path: '.env.production', type: 'file', critical: true },
      { path: 'nginx-sysme.conf', type: 'file', critical: false },
      { path: 'sysme.service', type: 'file', critical: false },
      { path: 'logs', type: 'directory', critical: false },
      { path: 'backups', type: 'directory', critical: false },
      { path: 'ssl', type: 'directory', critical: false }
    ];

    for (const item of requiredFiles) {
      const fullPath = path.join(rootDir, item.path);
      const exists = fs.existsSync(fullPath);

      if (exists) {
        const stats = fs.statSync(fullPath);
        const isCorrectType = item.type === 'file' ? stats.isFile() : stats.isDirectory();

        if (isCorrectType) {
          this.log('info', 'FILES', `${item.path} exists`);
        } else {
          this.log('error', 'FILES', `${item.path} exists but is wrong type`);
        }
      } else {
        if (item.critical) {
          this.log('error', 'FILES', `Missing critical file: ${item.path}`);
        } else {
          this.log('warning', 'FILES', `Missing optional file: ${item.path}`);
        }
      }
    }
  }

  // Environment configuration validation
  async validateEnvironment() {
    console.log('\\n⚙️  Validating Environment Configuration...');

    const requiredEnvVars = [
      { name: 'NODE_ENV', expected: 'production', critical: true },
      { name: 'PORT', type: 'number', critical: true },
      { name: 'DB_TYPE', expected: 'mysql', critical: true },
      { name: 'DB_HOST', critical: true },
      { name: 'DB_USER', critical: true },
      { name: 'DB_PASSWORD', critical: true },
      { name: 'DB_NAME', critical: true },
      { name: 'JWT_SECRET', minLength: 32, critical: true },
      { name: 'SESSION_SECRET', minLength: 32, critical: true },
      { name: 'CORS_ORIGIN', critical: true }
    ];

    for (const envVar of requiredEnvVars) {
      const value = process.env[envVar.name];

      if (!value) {
        if (envVar.critical) {
          this.log('error', 'ENV', `Missing critical environment variable: ${envVar.name}`);
        } else {
          this.log('warning', 'ENV', `Missing optional environment variable: ${envVar.name}`);
        }
        continue;
      }

      // Type validation
      if (envVar.type === 'number' && isNaN(parseInt(value))) {
        this.log('error', 'ENV', `${envVar.name} must be a number, got: ${value}`);
        continue;
      }

      // Expected value validation
      if (envVar.expected && value !== envVar.expected) {
        this.log('warning', 'ENV', `${envVar.name} expected '${envVar.expected}', got '${value}'`);
        continue;
      }

      // Minimum length validation
      if (envVar.minLength && value.length < envVar.minLength) {
        this.log('error', 'ENV', `${envVar.name} too short (min ${envVar.minLength} chars)`);
        continue;
      }

      this.log('info', 'ENV', `${envVar.name} configured correctly`);
    }

    // Security validation
    if (process.env.JWT_SECRET === 'your-secret-key' ||
        process.env.JWT_SECRET === 'test_jwt_secret_for_migration_testing') {
      this.log('error', 'SECURITY', 'JWT_SECRET is using default/test value - SECURITY RISK!');
    }

    if (process.env.DB_PASSWORD === 'CHANGE_THIS_PASSWORD' || !process.env.DB_PASSWORD) {
      this.log('error', 'SECURITY', 'Database password not set or using default value');
    }
  }

  // Database connectivity validation
  async validateDatabase() {
    console.log('\\n🗄️  Validating Database Configuration...');

    try {
      const dbConfig = {
        client: 'mysql2',
        connection: {
          host: process.env.DB_HOST,
          port: parseInt(process.env.DB_PORT) || 3306,
          user: process.env.DB_USER,
          password: process.env.DB_PASSWORD,
          database: process.env.DB_NAME,
          charset: 'utf8mb4'
        },
        pool: {
          min: parseInt(process.env.DB_POOL_MIN) || 5,
          max: parseInt(process.env.DB_POOL_MAX) || 20
        }
      };

      const db = knex(dbConfig);

      // Test basic connection
      await db.raw('SELECT 1 as test');
      this.log('info', 'DATABASE', 'Basic connection successful');

      // Check if required tables exist
      const requiredTables = ['users', 'salons', 'tarifas', 'categories', 'products', 'tables', 'sales', 'sale_items'];

      for (const tableName of requiredTables) {
        const exists = await db.schema.hasTable(tableName);
        if (exists) {
          this.log('info', 'DATABASE', `Table '${tableName}' exists`);

          // Check if table has data (except for sales which may be empty)
          if (['users', 'salons', 'tarifas'].includes(tableName)) {
            const count = await db(tableName).count('* as count').first();
            if (count.count > 0) {
              this.log('info', 'DATABASE', `Table '${tableName}' has ${count.count} records`);
            } else {
              this.log('warning', 'DATABASE', `Table '${tableName}' is empty`);
            }
          }
        } else {
          this.log('error', 'DATABASE', `Required table '${tableName}' missing`);
        }
      }

      // Test database performance
      const startTime = Date.now();
      await db.raw('SELECT COUNT(*) FROM users');
      const queryTime = Date.now() - startTime;

      if (queryTime < 100) {
        this.log('info', 'DATABASE', `Query performance good (${queryTime}ms)`);
      } else if (queryTime < 500) {
        this.log('warning', 'DATABASE', `Query performance acceptable (${queryTime}ms)`);
      } else {
        this.log('warning', 'DATABASE', `Query performance slow (${queryTime}ms)`);
      }

      await db.destroy();

    } catch (error) {
      this.log('error', 'DATABASE', 'Database connection failed', error.message);
    }
  }

  // Security configuration validation
  async validateSecurity() {
    console.log('\\n🔒 Validating Security Configuration...');

    // SSL Configuration
    if (process.env.HTTPS_ENABLED === 'true') {
      const sslCertPath = process.env.SSL_CERT_PATH;
      const sslKeyPath = process.env.SSL_KEY_PATH;

      if (sslCertPath && fs.existsSync(path.join(rootDir, sslCertPath))) {
        this.log('info', 'SECURITY', 'SSL certificate file found');
      } else {
        this.log('error', 'SECURITY', 'SSL certificate file missing');
      }

      if (sslKeyPath && fs.existsSync(path.join(rootDir, sslKeyPath))) {
        this.log('info', 'SECURITY', 'SSL private key file found');
      } else {
        this.log('error', 'SECURITY', 'SSL private key file missing');
      }
    } else {
      this.log('warning', 'SECURITY', 'HTTPS not enabled - not recommended for production');
    }

    // Rate limiting configuration
    const rateLimitMax = parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100;
    if (rateLimitMax > 200) {
      this.log('warning', 'SECURITY', 'Rate limit may be too high for production');
    } else {
      this.log('info', 'SECURITY', `Rate limiting configured: ${rateLimitMax} requests per window`);
    }

    // CORS configuration
    if (process.env.CORS_ORIGIN === '*') {
      this.log('error', 'SECURITY', 'CORS configured to allow all origins - SECURITY RISK!');
    } else if (process.env.CORS_ORIGIN) {
      this.log('info', 'SECURITY', `CORS configured for: ${process.env.CORS_ORIGIN}`);
    }
  }

  // Application readiness validation
  async validateApplication() {
    console.log('\\n🚀 Validating Application Readiness...');

    // Check package.json dependencies
    const packageJsonPath = path.join(rootDir, 'package.json');
    if (fs.existsSync(packageJsonPath)) {
      const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));

      const criticalDeps = ['express', 'mysql2', 'knex', 'bcryptjs', 'jsonwebtoken', 'helmet', 'cors'];
      for (const dep of criticalDeps) {
        if (packageJson.dependencies[dep]) {
          this.log('info', 'DEPS', `${dep} dependency found`);
        } else {
          this.log('error', 'DEPS', `Critical dependency missing: ${dep}`);
        }
      }

      // Check if production scripts exist
      const prodScripts = ['start', 'migrate:mysql', 'backup:create'];
      for (const script of prodScripts) {
        if (packageJson.scripts && packageJson.scripts[script]) {
          this.log('info', 'SCRIPTS', `Production script '${script}' defined`);
        } else {
          this.log('warning', 'SCRIPTS', `Production script '${script}' missing`);
        }
      }
    }

    // Check node_modules
    const nodeModulesPath = path.join(rootDir, 'node_modules');
    if (fs.existsSync(nodeModulesPath)) {
      this.log('info', 'DEPS', 'node_modules directory exists');
    } else {
      this.log('error', 'DEPS', 'node_modules missing - run npm install');
    }
  }

  // System requirements validation
  async validateSystemRequirements() {
    console.log('\\n💻 Validating System Requirements...');

    // Node.js version
    const nodeVersion = process.version;
    const majorVersion = parseInt(nodeVersion.slice(1).split('.')[0]);

    if (majorVersion >= 18) {
      this.log('info', 'SYSTEM', `Node.js version ${nodeVersion} is supported`);
    } else {
      this.log('error', 'SYSTEM', `Node.js version ${nodeVersion} is too old (require 18+)`);
    }

    // Memory usage
    const memUsage = process.memoryUsage();
    const heapUsedMB = Math.round(memUsage.heapUsed / 1024 / 1024);
    const heapTotalMB = Math.round(memUsage.heapTotal / 1024 / 1024);

    this.log('info', 'SYSTEM', `Memory usage: ${heapUsedMB}MB used, ${heapTotalMB}MB total`);

    if (heapTotalMB > 512) {
      this.log('warning', 'SYSTEM', 'High memory usage detected');
    }
  }

  // Generate validation report
  generateReport() {
    console.log('\\n📊 PRODUCTION VALIDATION REPORT');
    console.log('=====================================');

    const totalChecks = this.checks.length + this.warnings.length + this.errors.length;
    const successRate = ((this.checks.length / totalChecks) * 100).toFixed(1);

    console.log(`Total Checks: ${totalChecks}`);
    console.log(`✅ Passed: ${this.checks.length}`);
    console.log(`⚠️  Warnings: ${this.warnings.length}`);
    console.log(`❌ Errors: ${this.errors.length}`);
    console.log(`Success Rate: ${successRate}%`);

    if (this.errors.length === 0 && this.warnings.length <= 2) {
      console.log('\\n🎉 SYSTEM IS READY FOR PRODUCTION! 🎉');
      console.log('All critical checks passed. You can proceed with deployment.');
    } else if (this.errors.length === 0) {
      console.log('\\n✅ SYSTEM IS MOSTLY READY FOR PRODUCTION');
      console.log('No critical errors found, but please review warnings.');
    } else {
      console.log('\\n❌ SYSTEM NOT READY FOR PRODUCTION');
      console.log('Critical errors must be resolved before deployment.');
    }

    console.log('\\n📝 Recommendations:');
    if (this.errors.length > 0) {
      console.log('1. Resolve all critical errors listed above');
    }
    if (this.warnings.length > 0) {
      console.log('2. Review and address warnings when possible');
    }
    console.log('3. Test the system in a staging environment');
    console.log('4. Set up monitoring and alerting');
    console.log('5. Ensure backup procedures are in place');
    console.log('6. Document the deployment process');

    return {
      totalChecks,
      passed: this.checks.length,
      warnings: this.warnings.length,
      errors: this.errors.length,
      successRate: parseFloat(successRate),
      isReady: this.errors.length === 0 && this.warnings.length <= 2
    };
  }

  async runAllValidations() {
    console.log('🔍 SYSME Production Validation Starting...\\n');

    await this.validateFileStructure();
    await this.validateEnvironment();
    await this.validateDatabase();
    await this.validateSecurity();
    await this.validateApplication();
    await this.validateSystemRequirements();

    return this.generateReport();
  }
}

// Run validation if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const validator = new ProductionValidator();
  validator.runAllValidations().then(report => {
    process.exit(report.errors > 0 ? 1 : 0);
  }).catch(error => {
    console.error('❌ Validation failed:', error.message);
    process.exit(1);
  });
}

export { ProductionValidator };
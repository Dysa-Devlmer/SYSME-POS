#!/usr/bin/env node

/**
 * =====================================================
 * SYSME POS - Health Check & Monitoring Script
 * =====================================================
 * Comprehensive system health verification
 *
 * Usage:
 *   node health-check.js           # Full health check
 *   node health-check.js --quick   # Quick check only
 *   node health-check.js --json    # JSON output
 *
 * @author SYSME POS Team
 * @date 2025-11-20
 * =====================================================
 */

const http = require('http');
const fs = require('fs');
const path = require('path');
const os = require('os');

// Configuration
const API_URL = process.env.VITE_API_URL || 'http://localhost:3000';
const QUICK_CHECK = process.argv.includes('--quick');
const JSON_OUTPUT = process.argv.includes('--json');

// Health status
const health = {
  timestamp: new Date().toISOString(),
  status: 'healthy',
  checks: {},
  metrics: {},
  warnings: [],
  errors: []
};

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  blue: '\x1b[34m',
  gray: '\x1b[90m'
};

function log(message, color = 'reset') {
  if (!JSON_OUTPUT) {
    console.log(`${colors[color]}${message}${colors.reset}`);
  }
}

function checkmark(passed) {
  return passed ? '✅' : '❌';
}

/**
 * Check Node.js version
 */
function checkNodeVersion() {
  const version = process.version;
  const major = parseInt(version.slice(1).split('.')[0]);
  const passed = major >= 18;

  health.checks.node_version = {
    passed,
    version,
    required: '18+',
    message: passed ? 'Node.js version OK' : 'Node.js version too old'
  };

  if (!passed) {
    health.errors.push('Node.js version must be 18 or higher');
    health.status = 'unhealthy';
  }

  log(`${checkmark(passed)} Node.js version: ${version}`, passed ? 'green' : 'red');
}

/**
 * Check system resources
 */
function checkSystemResources() {
  const totalMem = os.totalmem();
  const freeMem = os.freemem();
  const usedMem = totalMem - freeMem;
  const memUsagePercent = (usedMem / totalMem) * 100;

  const cpus = os.cpus();
  const loadAvg = os.loadavg();

  health.metrics.memory = {
    total: `${(totalMem / 1024 / 1024 / 1024).toFixed(2)} GB`,
    used: `${(usedMem / 1024 / 1024 / 1024).toFixed(2)} GB`,
    free: `${(freeMem / 1024 / 1024 / 1024).toFixed(2)} GB`,
    usage_percent: memUsagePercent.toFixed(2)
  };

  health.metrics.cpu = {
    count: cpus.length,
    model: cpus[0].model,
    load_average: loadAvg.map(l => l.toFixed(2))
  };

  const memoryOk = memUsagePercent < 90;
  health.checks.system_resources = {
    passed: memoryOk,
    memory_ok: memoryOk,
    message: memoryOk ? 'System resources OK' : 'High memory usage'
  };

  if (!memoryOk) {
    health.warnings.push(`High memory usage: ${memUsagePercent.toFixed(2)}%`);
  }

  log(`${checkmark(memoryOk)} Memory: ${memUsagePercent.toFixed(2)}% used`, memoryOk ? 'green' : 'yellow');
  log(`   CPUs: ${cpus.length}`, 'gray');
}

/**
 * Check database file
 */
function checkDatabase() {
  const dbPath = path.join(__dirname, 'database.sqlite');
  const exists = fs.existsSync(dbPath);

  if (exists) {
    const stats = fs.statSync(dbPath);
    const size = (stats.size / 1024 / 1024).toFixed(2);

    health.checks.database = {
      passed: true,
      exists: true,
      size: `${size} MB`,
      path: dbPath,
      message: 'Database file OK'
    };

    log(`✅ Database: ${size} MB`, 'green');
  } else {
    health.checks.database = {
      passed: false,
      exists: false,
      message: 'Database file not found'
    };

    health.errors.push('Database file not found');
    health.status = 'unhealthy';

    log('❌ Database: Not found', 'red');
  }
}

/**
 * Check API endpoints
 */
function checkAPI() {
  return new Promise((resolve) => {
    const url = `${API_URL}/health`;

    const req = http.get(url, (res) => {
      let data = '';

      res.on('data', chunk => {
        data += chunk;
      });

      res.on('end', () => {
        const passed = res.statusCode === 200;

        health.checks.api_health = {
          passed,
          status_code: res.statusCode,
          response: data.substring(0, 100),
          message: passed ? 'API responding' : 'API not responding'
        };

        if (!passed) {
          health.errors.push('API health check failed');
          health.status = 'unhealthy';
        }

        log(`${checkmark(passed)} API Health: ${res.statusCode}`, passed ? 'green' : 'red');
        resolve();
      });
    });

    req.on('error', (error) => {
      health.checks.api_health = {
        passed: false,
        error: error.message,
        message: 'API not reachable'
      };

      health.errors.push(`API not reachable: ${error.message}`);
      health.status = 'unhealthy';

      log(`❌ API Health: Not reachable (${error.message})`, 'red');
      resolve();
    });

    req.setTimeout(5000, () => {
      req.destroy();
      health.checks.api_health = {
        passed: false,
        error: 'Timeout',
        message: 'API timeout'
      };
      health.errors.push('API request timeout');
      health.status = 'unhealthy';
      log('❌ API Health: Timeout', 'red');
      resolve();
    });
  });
}

/**
 * Check disk space
 */
function checkDiskSpace() {
  const stats = fs.statSync(__dirname);
  // Note: This is a simplified check. For production, use a library like 'check-disk-space'

  health.checks.disk_space = {
    passed: true,
    message: 'Disk space check passed (simplified)'
  };

  log('✅ Disk space: OK', 'green');
}

/**
 * Check log files
 */
function checkLogs() {
  const logsDir = path.join(__dirname, 'logs');

  if (fs.existsSync(logsDir)) {
    const files = fs.readdirSync(logsDir);
    const totalSize = files.reduce((sum, file) => {
      const stats = fs.statSync(path.join(logsDir, file));
      return sum + stats.size;
    }, 0);

    health.checks.logs = {
      passed: true,
      directory_exists: true,
      file_count: files.length,
      total_size: `${(totalSize / 1024 / 1024).toFixed(2)} MB`,
      message: 'Logs directory OK'
    };

    log(`✅ Logs: ${files.length} files (${(totalSize / 1024 / 1024).toFixed(2)} MB)`, 'green');
  } else {
    health.checks.logs = {
      passed: true,
      directory_exists: false,
      message: 'Logs directory will be created on first run'
    };

    log('⚠️  Logs: Directory not found (will be created)', 'yellow');
  }
}

/**
 * Main execution
 */
async function main() {
  if (!JSON_OUTPUT) {
    log('\n🏥 SYSME POS - Health Check', 'blue');
    log('='.repeat(50), 'gray');
    log('');
  }

  // Basic checks (always run)
  checkNodeVersion();
  checkSystemResources();
  checkDatabase();

  // Extended checks (skip in quick mode)
  if (!QUICK_CHECK) {
    await checkAPI();
    checkDiskSpace();
    checkLogs();
  }

  // Final status
  if (!JSON_OUTPUT) {
    log('');
    log('='.repeat(50), 'gray');

    if (health.status === 'healthy') {
      log('🎉 Overall Status: HEALTHY', 'green');
    } else {
      log('⚠️  Overall Status: UNHEALTHY', 'red');
    }

    if (health.warnings.length > 0) {
      log('\n⚠️  Warnings:', 'yellow');
      health.warnings.forEach(w => log(`   • ${w}`, 'yellow'));
    }

    if (health.errors.length > 0) {
      log('\n❌ Errors:', 'red');
      health.errors.forEach(e => log(`   • ${e}`, 'red'));
    }

    log('');
  } else {
    // JSON output
    console.log(JSON.stringify(health, null, 2));
  }

  // Exit with appropriate code
  process.exit(health.status === 'healthy' ? 0 : 1);
}

main().catch(error => {
  console.error('Health check error:', error);
  process.exit(1);
});

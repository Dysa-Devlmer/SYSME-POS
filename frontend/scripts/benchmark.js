#!/usr/bin/env node

/**
 * =====================================================
 * SYSME POS - Performance Benchmark Script
 * =====================================================
 * Comprehensive performance testing and reporting
 *
 * Usage:
 *   node benchmark.js                    # Full benchmark
 *   node benchmark.js --quick            # Quick benchmark
 *   node benchmark.js --api-only         # API endpoints only
 *   node benchmark.js --db-only          # Database only
 *   node benchmark.js --report           # Generate report
 *
 * @author SYSME POS Team
 * @date 2025-11-20
 * =====================================================
 */

const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');

// Configuration
const API_URL = process.env.VITE_API_URL || 'http://localhost:3000';
const DATABASE_PATH = process.env.DATABASE_URL || './database.sqlite';
const QUICK_MODE = process.argv.includes('--quick');
const API_ONLY = process.argv.includes('--api-only');
const DB_ONLY = process.argv.includes('--db-only');
const GENERATE_REPORT = process.argv.includes('--report');

// Test configuration
const CONCURRENT_USERS = QUICK_MODE ? 5 : 20;
const REQUESTS_PER_USER = QUICK_MODE ? 10 : 50;
const DB_QUERY_ITERATIONS = QUICK_MODE ? 100 : 1000;

// Colors
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  gray: '\x1b[90m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

// Benchmark results storage
const results = {
  timestamp: new Date().toISOString(),
  environment: {
    node_version: process.version,
    platform: process.platform,
    cpu_count: require('os').cpus().length,
    total_memory: `${(require('os').totalmem() / 1024 / 1024 / 1024).toFixed(2)} GB`,
    free_memory: `${(require('os').freemem() / 1024 / 1024 / 1024).toFixed(2)} GB`
  },
  api: {},
  database: {},
  summary: {}
};

/**
 * Make HTTP request with timing
 */
function makeRequest(endpoint, options = {}) {
  return new Promise((resolve, reject) => {
    const url = `${API_URL}${endpoint}`;
    const protocol = url.startsWith('https') ? https : http;

    const startTime = Date.now();

    const req = protocol.get(url, options, (res) => {
      let data = '';

      res.on('data', chunk => {
        data += chunk;
      });

      res.on('end', () => {
        const endTime = Date.now();
        const duration = endTime - startTime;

        resolve({
          success: res.statusCode >= 200 && res.statusCode < 300,
          statusCode: res.statusCode,
          duration,
          size: Buffer.byteLength(data)
        });
      });
    });

    req.on('error', (error) => {
      const endTime = Date.now();
      const duration = endTime - startTime;

      resolve({
        success: false,
        error: error.message,
        duration
      });
    });

    req.setTimeout(10000, () => {
      req.destroy();
      resolve({
        success: false,
        error: 'Timeout',
        duration: 10000
      });
    });
  });
}

/**
 * Benchmark API endpoint
 */
async function benchmarkEndpoint(endpoint, name, iterations = 100) {
  const results = [];

  for (let i = 0; i < iterations; i++) {
    const result = await makeRequest(endpoint);
    results.push(result);
  }

  const successful = results.filter(r => r.success);
  const failed = results.filter(r => !r.success);
  const durations = successful.map(r => r.duration);

  if (durations.length === 0) {
    return {
      name,
      endpoint,
      total_requests: iterations,
      successful: 0,
      failed: iterations,
      error: 'All requests failed'
    };
  }

  durations.sort((a, b) => a - b);

  return {
    name,
    endpoint,
    total_requests: iterations,
    successful: successful.length,
    failed: failed.length,
    avg_response_time: (durations.reduce((a, b) => a + b, 0) / durations.length).toFixed(2) + ' ms',
    min_response_time: durations[0] + ' ms',
    max_response_time: durations[durations.length - 1] + ' ms',
    median_response_time: durations[Math.floor(durations.length / 2)] + ' ms',
    p95_response_time: durations[Math.floor(durations.length * 0.95)] + ' ms',
    p99_response_time: durations[Math.floor(durations.length * 0.99)] + ' ms',
    requests_per_second: (successful.length / (durations.reduce((a, b) => a + b, 0) / 1000)).toFixed(2)
  };
}

/**
 * Benchmark concurrent requests
 */
async function benchmarkConcurrency(endpoint, name, concurrentUsers = 10, requestsPerUser = 50) {
  log(`\n  Testing ${name} with ${concurrentUsers} concurrent users, ${requestsPerUser} requests each...`, 'gray');

  const startTime = Date.now();
  const userPromises = [];

  for (let i = 0; i < concurrentUsers; i++) {
    const userRequests = [];
    for (let j = 0; j < requestsPerUser; j++) {
      userRequests.push(makeRequest(endpoint));
    }
    userPromises.push(Promise.all(userRequests));
  }

  const allResults = await Promise.all(userPromises);
  const endTime = Date.now();
  const totalDuration = endTime - startTime;

  const flatResults = allResults.flat();
  const successful = flatResults.filter(r => r.success);
  const failed = flatResults.filter(r => !r.success);
  const durations = successful.map(r => r.duration);

  if (durations.length === 0) {
    return {
      name: `${name} (Concurrent)`,
      endpoint,
      concurrent_users: concurrentUsers,
      requests_per_user: requestsPerUser,
      total_requests: flatResults.length,
      successful: 0,
      failed: flatResults.length,
      error: 'All requests failed'
    };
  }

  durations.sort((a, b) => a - b);

  return {
    name: `${name} (Concurrent)`,
    endpoint,
    concurrent_users: concurrentUsers,
    requests_per_user: requestsPerUser,
    total_requests: flatResults.length,
    successful: successful.length,
    failed: failed.length,
    total_duration: totalDuration + ' ms',
    avg_response_time: (durations.reduce((a, b) => a + b, 0) / durations.length).toFixed(2) + ' ms',
    median_response_time: durations[Math.floor(durations.length / 2)] + ' ms',
    p95_response_time: durations[Math.floor(durations.length * 0.95)] + ' ms',
    throughput: ((successful.length / totalDuration) * 1000).toFixed(2) + ' req/s'
  };
}

/**
 * Benchmark database queries
 */
function benchmarkDatabase() {
  log('\n📊 Database Performance Benchmarks', 'cyan');
  log('='.repeat(60), 'gray');

  const dbResults = {};

  try {
    const db = new Database(DATABASE_PATH, { readonly: true });

    // Simple SELECT query
    log('\n  Testing simple SELECT queries...', 'gray');
    const simpleSelectTimes = [];
    for (let i = 0; i < DB_QUERY_ITERATIONS; i++) {
      const start = Date.now();
      db.prepare('SELECT * FROM products LIMIT 10').all();
      simpleSelectTimes.push(Date.now() - start);
    }
    dbResults.simple_select = calculateStats(simpleSelectTimes, 'Simple SELECT (10 rows)');

    // Complex JOIN query
    log('  Testing complex JOIN queries...', 'gray');
    const joinTimes = [];
    for (let i = 0; i < Math.floor(DB_QUERY_ITERATIONS / 2); i++) {
      const start = Date.now();
      db.prepare(`
        SELECT o.*, od.*, p.name as product_name
        FROM orders o
        LEFT JOIN order_details od ON o.order_id = od.order_id
        LEFT JOIN products p ON od.product_id = p.product_id
        LIMIT 50
      `).all();
      joinTimes.push(Date.now() - start);
    }
    dbResults.complex_join = calculateStats(joinTimes, 'Complex JOIN (3 tables, 50 rows)');

    // Aggregation query
    log('  Testing aggregation queries...', 'gray');
    const aggTimes = [];
    for (let i = 0; i < DB_QUERY_ITERATIONS; i++) {
      const start = Date.now();
      db.prepare(`
        SELECT
          category_id,
          COUNT(*) as product_count,
          AVG(price) as avg_price,
          SUM(stock_quantity) as total_stock
        FROM products
        GROUP BY category_id
      `).all();
      aggTimes.push(Date.now() - start);
    }
    dbResults.aggregation = calculateStats(aggTimes, 'Aggregation (GROUP BY, COUNT, AVG, SUM)');

    // INSERT query
    log('  Testing INSERT queries...', 'gray');
    const dbWrite = new Database(DATABASE_PATH);
    const insertTimes = [];
    dbWrite.exec('BEGIN TRANSACTION');
    for (let i = 0; i < Math.min(100, DB_QUERY_ITERATIONS); i++) {
      const start = Date.now();
      dbWrite.prepare(`
        INSERT INTO audit_log (user_id, action, table_name, record_id, changes)
        VALUES (?, ?, ?, ?, ?)
      `).run(1, 'BENCHMARK_TEST', 'benchmark', i, JSON.stringify({ test: true }));
      insertTimes.push(Date.now() - start);
    }
    dbWrite.exec('ROLLBACK'); // Don't actually commit benchmark data
    dbResults.insert = calculateStats(insertTimes, 'INSERT single row');
    dbWrite.close();

    // Full-text search (if applicable)
    log('  Testing search queries...', 'gray');
    const searchTimes = [];
    for (let i = 0; i < DB_QUERY_ITERATIONS; i++) {
      const start = Date.now();
      db.prepare(`
        SELECT * FROM products
        WHERE name LIKE ? OR description LIKE ?
        LIMIT 20
      `).all('%pizza%', '%pizza%');
      searchTimes.push(Date.now() - start);
    }
    dbResults.search = calculateStats(searchTimes, 'LIKE search (name + description)');

    db.close();

    // Display results
    for (const [key, stats] of Object.entries(dbResults)) {
      displayStats(stats);
    }

  } catch (error) {
    log(`\n❌ Database benchmark failed: ${error.message}`, 'red');
    dbResults.error = error.message;
  }

  results.database = dbResults;
}

/**
 * Calculate statistics from timing array
 */
function calculateStats(times, name) {
  times.sort((a, b) => a - b);

  return {
    name,
    iterations: times.length,
    avg: (times.reduce((a, b) => a + b, 0) / times.length).toFixed(3) + ' ms',
    min: times[0].toFixed(3) + ' ms',
    max: times[times.length - 1].toFixed(3) + ' ms',
    median: times[Math.floor(times.length / 2)].toFixed(3) + ' ms',
    p95: times[Math.floor(times.length * 0.95)].toFixed(3) + ' ms',
    p99: times[Math.floor(times.length * 0.99)].toFixed(3) + ' ms'
  };
}

/**
 * Display statistics
 */
function displayStats(stats) {
  log(`\n  ${stats.name}:`, 'yellow');
  log(`    Iterations: ${stats.iterations}`, 'gray');
  log(`    Average:    ${stats.avg}`, 'gray');
  log(`    Median:     ${stats.median}`, 'gray');
  log(`    Min/Max:    ${stats.min} / ${stats.max}`, 'gray');
  log(`    P95/P99:    ${stats.p95} / ${stats.p99}`, 'gray');
}

/**
 * Benchmark API endpoints
 */
async function benchmarkAPI() {
  log('\n🌐 API Performance Benchmarks', 'cyan');
  log('='.repeat(60), 'gray');

  const endpoints = [
    { endpoint: '/health', name: 'Health Check' },
    { endpoint: '/api/products', name: 'List Products' },
    { endpoint: '/api/categories', name: 'List Categories' },
    { endpoint: '/api/customers', name: 'List Customers' }
  ];

  // Sequential requests
  log('\n📍 Sequential Requests (100 iterations each):', 'blue');

  for (const { endpoint, name } of endpoints) {
    log(`\n  Testing ${name}...`, 'gray');
    const result = await benchmarkEndpoint(endpoint, name, 100);
    displayEndpointResult(result);
    results.api[name.toLowerCase().replace(/ /g, '_')] = result;
  }

  // Concurrent requests
  if (!QUICK_MODE) {
    log('\n\n📍 Concurrent Requests:', 'blue');

    const concurrentResult = await benchmarkConcurrency(
      '/api/products',
      'List Products',
      CONCURRENT_USERS,
      REQUESTS_PER_USER
    );
    displayEndpointResult(concurrentResult);
    results.api.concurrent_test = concurrentResult;
  }
}

/**
 * Display endpoint result
 */
function displayEndpointResult(result) {
  if (result.error) {
    log(`\n  ❌ ${result.name}: ${result.error}`, 'red');
    return;
  }

  log(`\n  ${result.name}:`, 'yellow');
  log(`    Endpoint:       ${result.endpoint}`, 'gray');
  log(`    Total Requests: ${result.total_requests}`, 'gray');
  log(`    Successful:     ${result.successful}`, 'green');
  if (result.failed > 0) {
    log(`    Failed:         ${result.failed}`, 'red');
  }
  log(`    Avg Response:   ${result.avg_response_time}`, 'gray');
  log(`    Median:         ${result.median_response_time}`, 'gray');
  log(`    Min/Max:        ${result.min_response_time} / ${result.max_response_time}`, 'gray');
  log(`    P95/P99:        ${result.p95_response_time} / ${result.p99_response_time}`, 'gray');

  if (result.throughput) {
    log(`    Throughput:     ${result.throughput}`, 'cyan');
  } else if (result.requests_per_second) {
    log(`    Req/Second:     ${result.requests_per_second}`, 'cyan');
  }

  if (result.concurrent_users) {
    log(`    Concurrent:     ${result.concurrent_users} users × ${result.requests_per_user} requests`, 'gray');
    log(`    Total Duration: ${result.total_duration}`, 'gray');
  }
}

/**
 * Generate summary
 */
function generateSummary() {
  log('\n\n📋 Performance Summary', 'cyan');
  log('='.repeat(60), 'gray');

  const apiAvgTimes = Object.values(results.api)
    .filter(r => r.avg_response_time && !r.error)
    .map(r => parseFloat(r.avg_response_time));

  const dbAvgTimes = Object.values(results.database)
    .filter(r => r.avg && !r.error)
    .map(r => parseFloat(r.avg));

  if (apiAvgTimes.length > 0) {
    const avgApiTime = (apiAvgTimes.reduce((a, b) => a + b, 0) / apiAvgTimes.length).toFixed(2);
    log(`\n  Average API Response Time: ${avgApiTime} ms`, 'green');
    results.summary.avg_api_response_time = avgApiTime + ' ms';
  }

  if (dbAvgTimes.length > 0) {
    const avgDbTime = (dbAvgTimes.reduce((a, b) => a + b, 0) / dbAvgTimes.length).toFixed(3);
    log(`  Average DB Query Time:     ${avgDbTime} ms`, 'green');
    results.summary.avg_db_query_time = avgDbTime + ' ms';
  }

  const totalTests = Object.keys(results.api).length + Object.keys(results.database).length;
  const failedTests = [
    ...Object.values(results.api).filter(r => r.error || r.failed > r.successful * 0.1),
    ...Object.values(results.database).filter(r => r.error)
  ].length;

  log(`\n  Total Tests Run:           ${totalTests}`, 'gray');
  log(`  Passed:                    ${totalTests - failedTests}`, failedTests === 0 ? 'green' : 'yellow');
  if (failedTests > 0) {
    log(`  Failed/Warning:            ${failedTests}`, 'yellow');
  }

  results.summary.total_tests = totalTests;
  results.summary.passed = totalTests - failedTests;
  results.summary.failed = failedTests;

  // Performance rating
  let rating = 'Excellent';
  let ratingColor = 'green';

  if (apiAvgTimes.length > 0) {
    const avgApi = apiAvgTimes.reduce((a, b) => a + b, 0) / apiAvgTimes.length;
    if (avgApi > 200) {
      rating = 'Poor';
      ratingColor = 'red';
    } else if (avgApi > 100) {
      rating = 'Fair';
      ratingColor = 'yellow';
    } else if (avgApi > 50) {
      rating = 'Good';
      ratingColor = 'green';
    }
  }

  log(`\n  Overall Performance:       ${rating}`, ratingColor);
  results.summary.performance_rating = rating;
}

/**
 * Save report to file
 */
function saveReport() {
  const reportPath = path.join(__dirname, 'reports', `benchmark-${Date.now()}.json`);
  const reportsDir = path.dirname(reportPath);

  if (!fs.existsSync(reportsDir)) {
    fs.mkdirSync(reportsDir, { recursive: true });
  }

  fs.writeFileSync(reportPath, JSON.stringify(results, null, 2));

  log(`\n\n📄 Report saved: ${reportPath}`, 'cyan');

  // Also save as latest
  const latestPath = path.join(reportsDir, 'benchmark-latest.json');
  fs.writeFileSync(latestPath, JSON.stringify(results, null, 2));

  log(`📄 Latest report: ${latestPath}`, 'cyan');
}

/**
 * Main execution
 */
async function main() {
  log('\n' + '='.repeat(60), 'blue');
  log('⚡ SYSME POS - Performance Benchmark', 'blue');
  log('='.repeat(60), 'blue');
  log(`Mode: ${QUICK_MODE ? 'QUICK' : 'FULL'}`, 'cyan');
  log('='.repeat(60) + '\n', 'blue');

  const startTime = Date.now();

  try {
    if (!DB_ONLY) {
      await benchmarkAPI();
    }

    if (!API_ONLY) {
      benchmarkDatabase();
    }

    generateSummary();

    if (GENERATE_REPORT) {
      saveReport();
    }

    const totalDuration = ((Date.now() - startTime) / 1000).toFixed(2);

    log('\n' + '='.repeat(60), 'gray');
    log(`🎉 Benchmark completed in ${totalDuration} seconds`, 'green');
    log('='.repeat(60) + '\n', 'gray');

    process.exit(0);
  } catch (error) {
    log(`\n❌ Benchmark failed: ${error.message}`, 'red');
    console.error(error);
    process.exit(1);
  }
}

main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});

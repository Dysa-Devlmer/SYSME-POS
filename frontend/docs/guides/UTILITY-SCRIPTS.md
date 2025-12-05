# 🛠️ SYSME POS - Utility Scripts Guide

Complete guide to all utility scripts included in SYSME POS v2.1.

---

## 📋 Table of Contents

- [Setup & Installation](#setup--installation)
- [Database Management](#database-management)
- [Monitoring & Health](#monitoring--health)
- [Performance Testing](#performance-testing)
- [Demo Data](#demo-data)
- [Troubleshooting](#troubleshooting)

---

## 🚀 Setup & Installation

### Automated Setup Script

**File:** `setup.js`

**Purpose:** One-command installation and configuration of the entire SYSME POS system.

**Usage:**

```bash
# Interactive setup (recommended for first-time users)
node setup.js

# Quick setup with defaults (fast, no prompts)
node setup.js --quick

# Production configuration
node setup.js --production

# Development configuration
node setup.js --development
```

**What it does:**

1. ✅ Checks system requirements (Node.js 18+, npm, memory, disk space)
2. ✅ Creates necessary directories (logs, backups, uploads, temp)
3. ✅ Generates environment configuration (.env files)
4. ✅ Installs backend dependencies
5. ✅ Installs frontend dependencies
6. ✅ Initializes database with schema
7. ✅ Optionally loads demo data
8. ✅ Runs initial tests (optional)
9. ✅ Displays next steps and usage instructions

**Example Output:**

```
============================================================
🚀 SYSME POS - Automated Setup
============================================================
Mode: INTERACTIVE
============================================================

▶ Checking system requirements...
✅ Node.js v18.17.0 (required: 18+)
✅ npm 9.8.1
✅ git version 2.40.0
✅ Disk space: OK
✅ Memory: 16.00 GB (required: 2GB+)

✅ All requirements met!

▶ Creating necessary directories...
✅ Created: backend/logs
✅ Created: backend/backups
✅ Created: backend/uploads
✅ Created: backend/temp

▶ Creating environment configuration...
Use default configuration? (yes/no) [yes]: yes
✅ Backend .env created
✅ Frontend .env created

▶ Installing backend dependencies...
ℹ️  Running npm install in backend...
✅ Backend dependencies installed

▶ Installing frontend dependencies...
ℹ️  Running npm install in frontend...
✅ Frontend dependencies installed

▶ Initializing database...
ℹ️  Creating database schema...
✅ Database initialized successfully
Load demo data for testing? (yes/no) [no]: yes
✅ Demo data loaded successfully

============================================================
🎉 SETUP COMPLETED SUCCESSFULLY!
============================================================

📋 Next Steps:

1. Start the backend server:
   cd backend && npm start

2. In a new terminal, start the frontend:
   npm run dev

3. Open your browser:
   http://localhost:5173

4. Login with default credentials:
   Username: admin
   Password: admin123
   ⚠️  CHANGE PASSWORD IMMEDIATELY!
```

---

## 💾 Database Management

### Backup Script

**File:** `backend/backup.sh`

**Purpose:** Create timestamped, compressed backups of the database.

**Usage:**

```bash
# Local backup only
./backend/backup.sh

# Backup + upload to cloud (AWS S3)
./backend/backup.sh --cloud

# Backup + cleanup old backups (30+ days)
./backend/backup.sh --cleanup

# All features combined
./backend/backup.sh --cloud --cleanup
```

**Requirements:**
- Database file exists
- Write permissions to `./backend/backups/`
- For cloud upload: AWS CLI configured + `AWS_S3_BUCKET` env variable set

**Example Output:**

```
🔄 SYSME POS - Database Backup
========================================

📦 Creating backup...
✅ Backup created: ./backups/backup_20251120_143022.sqlite (5.2M)

🗜️  Compressing backup...
✅ Compressed: ./backups/backup_20251120_143022.sqlite.gz (1.3M)

☁️  Uploading to cloud...
✅ Uploaded to S3: s3://my-bucket/backups/backup_20251120_143022.sqlite.gz

🧹 Cleaning up old backups (older than 30 days)...
   Deleted: backup_20250921_120000.sqlite.gz
   Deleted: backup_20250920_120000.sqlite.gz
✅ Deleted 2 old backup(s)

========================================
🎉 Backup completed successfully!

Backup details:
  • File: backup_20251120_143022.sqlite.gz
  • Size: 1.3M
  • Location: ./backups
  • Cloud: Uploaded to S3
  • Cleanup: 2 old backups removed
```

**Automation:**

Add to crontab for daily backups:

```bash
# Daily backup at 2 AM with cloud upload and cleanup
0 2 * * * cd /path/to/sysme-pos/backend && ./backup.sh --cloud --cleanup >> logs/backup.log 2>&1
```

---

### Restore Script

**File:** `backend/restore.sh`

**Purpose:** Restore database from a previous backup.

**Usage:**

```bash
# Interactive mode (select from available backups)
./backend/restore.sh

# Restore specific backup file
./backend/restore.sh backup_20251120_143022.sqlite.gz

# Restore from backups directory
./backend/restore.sh backups/backup_20251120_143022.sqlite.gz
```

**Safety Features:**
- Creates safety backup of current database before restoring
- Requires confirmation before proceeding
- Lists all available backups with size and date

**Example Output:**

```
🔄 SYSME POS - Database Restore
========================================

📂 Available backups:

  [0] backup_20251120_143022.sqlite.gz - 1.3M - 2025-11-20 14:30:22
  [1] backup_20251119_020000.sqlite.gz - 1.2M - 2025-11-19 02:00:00
  [2] backup_20251118_020000.sqlite.gz - 1.1M - 2025-11-18 02:00:00

Enter backup number to restore (or 'q' to quit): 0

⚠️  WARNING: This will replace the current database!
⚠️  Current database will be backed up before restore.

Selected backup: backup_20251120_143022.sqlite.gz

Continue? (yes/no): yes

📦 Creating safety backup of current database...
✅ Safety backup created: ./database.sqlite.before-restore.20251120_145033

🗜️  Decompressing backup...
🔄 Restoring database...
✅ Database restored successfully! (5.2M)

========================================
🎉 Restore completed!

Next steps:
  1. Restart your application
  2. Verify data integrity
  3. Test critical functionality

Safety backup location:
  ./database.sqlite.before-restore.20251120_145033
```

---

## 🏥 Monitoring & Health

### Health Check Script

**File:** `backend/health-check.js`

**Purpose:** Comprehensive system health verification.

**Usage:**

```bash
# Full health check (all tests)
node backend/health-check.js

# Quick check only (basic tests)
node backend/health-check.js --quick

# JSON output (for monitoring tools)
node backend/health-check.js --json
```

**Checks Performed:**

| Check | Description |
|-------|-------------|
| **Node.js Version** | Verifies Node.js 18+ is installed |
| **System Resources** | Monitors memory usage and CPU load |
| **Database** | Checks database file exists and size |
| **API Health** | Requests `/health` endpoint (requires server running) |
| **Disk Space** | Verifies adequate disk space |
| **Log Files** | Checks logs directory and file count |

**Example Output:**

```
🏥 SYSME POS - Health Check
==================================================

✅ Node.js version: v18.17.0
✅ Memory: 42.50% used
   CPUs: 8
✅ Database: 5.20 MB
✅ API Health: 200
✅ Disk space: OK
✅ Logs: 15 files (2.34 MB)

==================================================
🎉 Overall Status: HEALTHY
==================================================
```

**JSON Output:**

```bash
node backend/health-check.js --json
```

```json
{
  "timestamp": "2025-11-20T14:50:33.123Z",
  "status": "healthy",
  "checks": {
    "node_version": {
      "passed": true,
      "version": "v18.17.0",
      "required": "18+",
      "message": "Node.js version OK"
    },
    "system_resources": {
      "passed": true,
      "memory_ok": true,
      "message": "System resources OK"
    },
    "database": {
      "passed": true,
      "exists": true,
      "size": "5.20 MB",
      "path": "./database.sqlite",
      "message": "Database file OK"
    },
    "api_health": {
      "passed": true,
      "status_code": 200,
      "response": "{\"status\":\"ok\",\"timestamp\":\"2025-11-20T14:50:33.456Z\"}",
      "message": "API responding"
    }
  },
  "metrics": {
    "memory": {
      "total": "16.00 GB",
      "used": "6.80 GB",
      "free": "9.20 GB",
      "usage_percent": "42.50"
    },
    "cpu": {
      "count": 8,
      "model": "Intel(R) Core(TM) i7-9750H CPU @ 2.60GHz",
      "load_average": ["2.34", "2.56", "2.78"]
    }
  },
  "warnings": [],
  "errors": []
}
```

**Exit Codes:**
- `0` - Healthy (all checks passed)
- `1` - Unhealthy (one or more checks failed)

**Automation:**

Use in monitoring scripts:

```bash
#!/bin/bash
# Check health every 5 minutes
while true; do
  if ! node backend/health-check.js --quick; then
    echo "Health check failed! Sending alert..."
    # Send alert (email, Slack, PagerDuty, etc.)
  fi
  sleep 300
done
```

---

## ⚡ Performance Testing

### Benchmark Script

**File:** `backend/benchmark.js`

**Purpose:** Comprehensive performance testing and reporting.

**Usage:**

```bash
# Full benchmark (API + Database)
node backend/benchmark.js

# Quick benchmark (reduced iterations)
node backend/benchmark.js --quick

# API endpoints only
node backend/benchmark.js --api-only

# Database queries only
node backend/benchmark.js --db-only

# Generate JSON report
node backend/benchmark.js --report
```

**Test Categories:**

### 1. API Performance

Tests API endpoints with:
- Sequential requests (100 iterations each)
- Concurrent load (20 users × 50 requests = 1,000 total)
- Response time measurement (avg, median, P95, P99)
- Throughput calculation (req/s)

**Endpoints tested:**
- `/health` - Health check
- `/api/products` - List products
- `/api/categories` - List categories
- `/api/customers` - List customers

### 2. Database Performance

Tests database queries with:
- Simple SELECT (10 rows)
- Complex JOIN (3 tables, 50 rows)
- Aggregation (GROUP BY, COUNT, AVG, SUM)
- INSERT operations
- Full-text LIKE search

**Iterations:**
- Full mode: 1,000 iterations per test
- Quick mode: 100 iterations per test

**Example Output:**

```
============================================================
⚡ SYSME POS - Performance Benchmark
============================================================
Mode: FULL
============================================================

🌐 API Performance Benchmarks
============================================================

📍 Sequential Requests (100 iterations each):

  Testing Health Check...

  Health Check:
    Endpoint:       /health
    Total Requests: 100
    Successful:     100
    Avg Response:   8.32 ms
    Median:         7.10 ms
    Min/Max:        5.20 ms / 18.70 ms
    P95/P99:        12.40 ms / 18.70 ms
    Req/Second:     120.48

  Testing List Products...

  List Products:
    Endpoint:       /api/products
    Total Requests: 100
    Successful:     100
    Avg Response:   42.15 ms
    Median:         38.50 ms
    Min/Max:        28.30 ms / 89.40 ms
    P95/P99:        67.20 ms / 89.40 ms
    Req/Second:     23.72


📍 Concurrent Requests:

  Testing List Products with 20 concurrent users, 50 requests each...

  List Products (Concurrent):
    Endpoint:       /api/products
    Concurrent:     20 users × 50 requests
    Total Requests: 1000
    Successful:     1000
    Failed:         0
    Total Duration: 8400 ms
    Avg Response:   156.40 ms
    Median:         142.30 ms
    P95:            234.50 ms
    Throughput:     119.05 req/s


📊 Database Performance Benchmarks
============================================================

  Testing simple SELECT queries...
  Testing complex JOIN queries...
  Testing aggregation queries...
  Testing INSERT queries...
  Testing search queries...

  Simple SELECT (10 rows):
    Iterations: 1000
    Average:    2.100 ms
    Median:     1.800 ms
    Min/Max:    1.200 ms / 5.200 ms
    P95/P99:    3.400 ms / 5.200 ms

  Complex JOIN (3 tables, 50 rows):
    Iterations: 500
    Average:    8.700 ms
    Median:     7.900 ms
    Min/Max:    5.300 ms / 16.800 ms
    P95/P99:    12.300 ms / 16.800 ms

  Aggregation (GROUP BY, COUNT, AVG, SUM):
    Iterations: 1000
    Average:    5.300 ms
    Median:     4.900 ms
    Min/Max:    3.200 ms / 11.400 ms
    P95/P99:    8.100 ms / 11.400 ms

  INSERT single row:
    Iterations: 100
    Average:    1.400 ms
    Median:     1.200 ms
    Min/Max:    0.800 ms / 3.800 ms
    P95/P99:    2.300 ms / 3.800 ms

  LIKE search (name + description):
    Iterations: 1000
    Average:    18.200 ms
    Median:     16.700 ms
    Min/Max:    12.100 ms / 34.100 ms
    P95/P99:    26.400 ms / 34.100 ms


📋 Performance Summary
============================================================

  Average API Response Time: 68.82 ms
  Average DB Query Time:     7.140 ms

  Total Tests Run:           10
  Passed:                    10
  Failed/Warning:            0

  Overall Performance:       Excellent

============================================================
🎉 Benchmark completed in 45.67 seconds
============================================================
```

**Generated Reports:**

When using `--report` flag:
- `backend/reports/benchmark-[timestamp].json` - Full detailed report
- `backend/reports/benchmark-latest.json` - Always points to latest run

**Report Structure:**

```json
{
  "timestamp": "2025-11-20T15:00:00.123Z",
  "environment": {
    "node_version": "v18.17.0",
    "platform": "linux",
    "cpu_count": 8,
    "total_memory": "16.00 GB",
    "free_memory": "9.20 GB"
  },
  "api": {
    "health_check": {
      "name": "Health Check",
      "endpoint": "/health",
      "total_requests": 100,
      "successful": 100,
      "failed": 0,
      "avg_response_time": "8.32 ms",
      "median_response_time": "7.10 ms",
      "p95_response_time": "12.40 ms",
      "p99_response_time": "18.70 ms"
    }
  },
  "database": {
    "simple_select": {
      "name": "Simple SELECT (10 rows)",
      "iterations": 1000,
      "avg": "2.100 ms",
      "median": "1.800 ms",
      "p95": "3.400 ms",
      "p99": "5.200 ms"
    }
  },
  "summary": {
    "avg_api_response_time": "68.82 ms",
    "avg_db_query_time": "7.140 ms",
    "total_tests": 10,
    "passed": 10,
    "failed": 0,
    "performance_rating": "Excellent"
  }
}
```

---

## 🎭 Demo Data

### Demo Data Seeder

**File:** `backend/seed-demo-data.js`

**Purpose:** Populate database with realistic demo data for testing and demos.

**Usage:**

```bash
# Seed demo data (preserves existing data)
node backend/seed-demo-data.js

# Clear existing data first, then seed
node backend/seed-demo-data.js --clear
```

**Data Created:**

| Data Type | Quantity | Details |
|-----------|----------|---------|
| **Categories** | 8 | Pizzas, Burgers, Pasta, Salads, Desserts, Beverages, Appetizers, Breakfast |
| **Products** | 25+ | Realistic products with SKUs, prices, costs |
| **Inventory** | 25+ | Random stock quantities (20-147 units) |
| **Customers** | 10 | With emails, phones, loyalty points |
| **Orders** | 20 | Completed sample orders with realistic data |
| **Suppliers** | 5 | With contact info and categories |

**Example Output:**

```
🎭 SYSME POS - Demo Data Seeder
========================================

Seeding categories...
✅ 8 categories created

Seeding products...
✅ 25 products created

Seeding inventory...
✅ 25 inventory records created

Seeding customers...
✅ 10 customers created

Seeding orders...
✅ 20 orders created

Seeding suppliers...
✅ 5 suppliers created

========================================
🎉 Demo data seeded successfully!

Summary:
  • 8 categories
  • 25 products
  • 25 inventory items
  • 10 customers
  • 20 sample orders
  • 5 suppliers

You can now login and explore the system with realistic data!
========================================
```

**Sample Products Created:**

- Pizza Margherita ($150.00)
- Pepperoni Pizza ($180.00)
- Classic Burger ($120.00)
- Spaghetti Carbonara ($140.00)
- Caesar Salad ($90.00)
- Chocolate Brownie ($60.00)
- Coca Cola ($25.00)
- Chicken Wings ($110.00)
- Pancakes ($85.00)
- ...and more

**When to Use:**

- ✅ First-time setup for testing
- ✅ Demos and presentations
- ✅ Development environment
- ✅ Training new users
- ❌ **NOT for production!**

---

## 🔧 Troubleshooting

### Common Issues

#### 1. Setup Script Fails

**Symptom:** `node setup.js` fails with dependency errors

**Solution:**
```bash
# Clear npm cache
npm cache clean --force

# Remove existing node_modules
rm -rf node_modules backend/node_modules

# Run setup again
node setup.js
```

#### 2. Backup Script Permission Denied

**Symptom:** `./backend/backup.sh: Permission denied`

**Solution:**
```bash
# Make script executable
chmod +x backend/backup.sh
chmod +x backend/restore.sh

# Run script
./backend/backup.sh
```

**Windows Users:**
```bash
# Use bash or Git Bash
bash backend/backup.sh

# Or convert to batch script
# See DEPLOYMENT-GUIDE.md for Windows alternatives
```

#### 3. Health Check API Timeout

**Symptom:** `❌ API Health: Timeout`

**Solution:**
```bash
# 1. Check if backend is running
curl http://localhost:3000/health

# 2. If not, start backend
cd backend && npm start

# 3. Run health check again
node backend/health-check.js
```

#### 4. Benchmark Database Locked

**Symptom:** `Error: database is locked`

**Solution:**
```bash
# 1. Stop all running processes accessing the database
pm2 stop all  # or kill node processes

# 2. Wait a few seconds

# 3. Run benchmark again
node backend/benchmark.js
```

#### 5. Demo Data Already Exists

**Symptom:** `Error: UNIQUE constraint failed`

**Solution:**
```bash
# Use --clear flag to remove existing data first
node backend/seed-demo-data.js --clear
```

---

## 📊 Integration with CI/CD

### GitHub Actions Example

```yaml
name: CI/CD Pipeline

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'

      - name: Run automated setup
        run: node setup.js --quick

      - name: Health check
        run: node backend/health-check.js

      - name: Run benchmarks
        run: node backend/benchmark.js --quick --report

      - name: Upload benchmark report
        uses: actions/upload-artifact@v3
        with:
          name: benchmark-report
          path: backend/reports/benchmark-latest.json

      - name: Create backup
        run: bash backend/backup.sh

      - name: Run tests
        run: npm test
```

---

## 📖 Additional Resources

- [QUICK-START.md](QUICK-START.md) - Getting started guide
- [DEPLOYMENT-GUIDE.md](DEPLOYMENT-GUIDE.md) - Production deployment
- [FAQ.md](FAQ.md) - Frequently asked questions
- [CONTRIBUTING.md](CONTRIBUTING.md) - Contribution guidelines
- [ULTIMATE-SHOWCASE.md](ULTIMATE-SHOWCASE.md) - Complete project showcase

---

## 🆘 Need Help?

- 📖 Check [FAQ.md](FAQ.md)
- 🐛 [Report Issues](https://github.com/your-repo/sysme-pos/issues)
- 💬 [Ask in Discussions](https://github.com/your-repo/sysme-pos/discussions)
- 📧 Email: [INSERT SUPPORT EMAIL]

---

**Last Updated:** November 20, 2025
**Version:** 2.1.0

**All scripts tested on:**
- ✅ Ubuntu 20.04+
- ✅ macOS 12+
- ✅ Windows 10/11 (with Git Bash)

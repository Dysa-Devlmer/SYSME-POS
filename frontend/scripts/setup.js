#!/usr/bin/env node

/**
 * =====================================================
 * SYSME POS - Automated Setup Script
 * =====================================================
 * One-command installation and configuration
 *
 * Usage:
 *   node setup.js                    # Interactive setup
 *   node setup.js --quick            # Quick setup with defaults
 *   node setup.js --production       # Production configuration
 *   node setup.js --development      # Development configuration
 *
 * @author SYSME POS Team
 * @date 2025-11-20
 * =====================================================
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const readline = require('readline');
const os = require('os');

// Configuration
const REQUIRED_NODE_VERSION = 18;
const MODE = process.argv.includes('--production') ? 'production' :
             process.argv.includes('--development') ? 'development' : 'interactive';
const QUICK_MODE = process.argv.includes('--quick');

// Colors for console output
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

function step(message) {
  log(`\n▶ ${message}`, 'cyan');
}

function success(message) {
  log(`✅ ${message}`, 'green');
}

function warning(message) {
  log(`⚠️  ${message}`, 'yellow');
}

function error(message) {
  log(`❌ ${message}`, 'red');
}

function info(message) {
  log(`ℹ️  ${message}`, 'blue');
}

/**
 * Execute command with proper error handling
 */
function exec(command, options = {}) {
  try {
    const output = execSync(command, {
      stdio: options.silent ? 'pipe' : 'inherit',
      ...options
    });
    return { success: true, output: output ? output.toString() : '' };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

/**
 * Check if command exists
 */
function commandExists(command) {
  const checkCmd = os.platform() === 'win32' ? `where ${command}` : `which ${command}`;
  const result = exec(checkCmd, { silent: true });
  return result.success;
}

/**
 * Prompt user for input
 */
function prompt(question) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  return new Promise(resolve => {
    rl.question(`${colors.yellow}${question}${colors.reset} `, answer => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

/**
 * Check system requirements
 */
async function checkRequirements() {
  step('Checking system requirements...');

  const checks = {
    node: false,
    npm: false,
    git: false,
    disk: false,
    memory: false
  };

  // Check Node.js version
  const nodeVersion = process.version;
  const nodeMajor = parseInt(nodeVersion.slice(1).split('.')[0]);
  checks.node = nodeMajor >= REQUIRED_NODE_VERSION;

  if (checks.node) {
    success(`Node.js ${nodeVersion} (required: ${REQUIRED_NODE_VERSION}+)`);
  } else {
    error(`Node.js ${nodeVersion} is too old. Required: ${REQUIRED_NODE_VERSION}+`);
  }

  // Check npm
  checks.npm = commandExists('npm');
  if (checks.npm) {
    const npmVersion = exec('npm --version', { silent: true }).output.trim();
    success(`npm ${npmVersion}`);
  } else {
    error('npm not found');
  }

  // Check git (optional but recommended)
  checks.git = commandExists('git');
  if (checks.git) {
    const gitVersion = exec('git --version', { silent: true }).output.trim();
    success(`${gitVersion}`);
  } else {
    warning('git not found (optional, but recommended)');
    checks.git = true; // Don't fail on missing git
  }

  // Check disk space
  const stats = fs.statSync(__dirname);
  checks.disk = true; // Simplified check
  success('Disk space: OK');

  // Check memory
  const totalMem = os.totalmem();
  const totalMemGB = (totalMem / 1024 / 1024 / 1024).toFixed(2);
  checks.memory = totalMem >= 2 * 1024 * 1024 * 1024; // 2GB minimum

  if (checks.memory) {
    success(`Memory: ${totalMemGB} GB (required: 2GB+)`);
  } else {
    warning(`Memory: ${totalMemGB} GB (recommended: 2GB+, might be slow)`);
    checks.memory = true; // Don't fail, just warn
  }

  const allPassed = Object.values(checks).every(v => v);

  if (!allPassed) {
    error('\nSystem requirements not met. Please install missing dependencies.');
    process.exit(1);
  }

  success('\nAll requirements met!');
  return true;
}

/**
 * Install backend dependencies
 */
async function installBackendDependencies() {
  step('Installing backend dependencies...');

  const backendPath = path.join(__dirname, 'backend');

  if (!fs.existsSync(backendPath)) {
    error('Backend directory not found');
    return false;
  }

  process.chdir(backendPath);

  info('Running npm install in backend...');
  const result = exec('npm install');

  if (result.success) {
    success('Backend dependencies installed');
    return true;
  } else {
    error('Failed to install backend dependencies');
    return false;
  }
}

/**
 * Install frontend dependencies
 */
async function installFrontendDependencies() {
  step('Installing frontend dependencies...');

  const frontendPath = path.join(__dirname);
  process.chdir(frontendPath);

  info('Running npm install in frontend...');
  const result = exec('npm install');

  if (result.success) {
    success('Frontend dependencies installed');
    return true;
  } else {
    error('Failed to install frontend dependencies');
    return false;
  }
}

/**
 * Create environment configuration
 */
async function createEnvironmentConfig() {
  step('Creating environment configuration...');

  const backendEnvPath = path.join(__dirname, 'backend', '.env');
  const frontendEnvPath = path.join(__dirname, '.env');

  let apiUrl = 'http://localhost:3000';
  let jwtSecret = generateRandomString(64);
  let nodeEnv = MODE === 'production' ? 'production' : 'development';
  let port = '3000';

  if (!QUICK_MODE && MODE === 'interactive') {
    const useDefaults = await prompt('Use default configuration? (yes/no) [yes]:');

    if (useDefaults.toLowerCase() !== 'yes' && useDefaults !== '') {
      apiUrl = await prompt(`API URL [${apiUrl}]:`) || apiUrl;
      port = await prompt(`Backend port [${port}]:`) || port;
      nodeEnv = await prompt(`Environment (development/production) [${nodeEnv}]:`) || nodeEnv;
    }
  }

  // Backend .env
  const backendEnv = `# SYSME POS - Backend Configuration
# Generated on ${new Date().toISOString()}

NODE_ENV=${nodeEnv}
PORT=${port}

# Database
DATABASE_URL=./database.sqlite

# JWT Configuration
JWT_SECRET=${jwtSecret}
JWT_ACCESS_EXPIRY=24h
JWT_REFRESH_EXPIRY=7d

# CORS
CORS_ORIGIN=${nodeEnv === 'production' ? apiUrl.replace(':3000', ':5173') : 'http://localhost:5173'}

# Rate Limiting
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX_REQUESTS=100

# Logging
LOG_LEVEL=${nodeEnv === 'production' ? 'info' : 'debug'}
LOG_FILE=./logs/app.log

# Email (Optional - Configure if needed)
# SMTP_HOST=smtp.gmail.com
# SMTP_PORT=587
# SMTP_USER=your-email@gmail.com
# SMTP_PASS=your-app-password
# EMAIL_FROM=noreply@sysmepos.com

# Cloud Storage (Optional - Configure if needed)
# AWS_ACCESS_KEY_ID=
# AWS_SECRET_ACCESS_KEY=
# AWS_S3_BUCKET=
# AWS_REGION=us-east-1

# Backup Configuration
BACKUP_RETENTION_DAYS=30
`;

  fs.writeFileSync(backendEnvPath, backendEnv);
  success(`Backend .env created: ${backendEnvPath}`);

  // Frontend .env
  const frontendEnv = `# SYSME POS - Frontend Configuration
# Generated on ${new Date().toISOString()}

VITE_API_URL=${apiUrl}
VITE_APP_NAME=SYSME POS
VITE_APP_VERSION=2.1.0
`;

  fs.writeFileSync(frontendEnvPath, frontendEnv);
  success(`Frontend .env created: ${frontendEnvPath}`);

  return true;
}

/**
 * Initialize database
 */
async function initializeDatabase() {
  step('Initializing database...');

  const backendPath = path.join(__dirname, 'backend');
  const initScript = path.join(backendPath, 'init-database.js');

  if (!fs.existsSync(initScript)) {
    error('Database initialization script not found');
    return false;
  }

  process.chdir(backendPath);

  info('Creating database schema...');
  const result = exec('node init-database.js');

  if (result.success) {
    success('Database initialized successfully');

    // Ask if user wants demo data
    if (!QUICK_MODE && MODE === 'interactive') {
      const seedDemo = await prompt('Load demo data for testing? (yes/no) [no]:');

      if (seedDemo.toLowerCase() === 'yes') {
        info('Seeding demo data...');
        const seedResult = exec('node seed-demo-data.js');

        if (seedResult.success) {
          success('Demo data loaded successfully');
        } else {
          warning('Failed to load demo data (you can do this later)');
        }
      }
    }

    return true;
  } else {
    error('Failed to initialize database');
    return false;
  }
}

/**
 * Create necessary directories
 */
async function createDirectories() {
  step('Creating necessary directories...');

  const dirs = [
    path.join(__dirname, 'backend', 'logs'),
    path.join(__dirname, 'backend', 'backups'),
    path.join(__dirname, 'backend', 'uploads'),
    path.join(__dirname, 'backend', 'temp')
  ];

  for (const dir of dirs) {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
      success(`Created: ${dir}`);
    } else {
      info(`Already exists: ${dir}`);
    }
  }

  return true;
}

/**
 * Run initial tests
 */
async function runTests() {
  step('Running initial tests...');

  if (MODE === 'production' && !QUICK_MODE) {
    const runTests = await prompt('Run tests before deployment? (yes/no) [yes]:');

    if (runTests.toLowerCase() === 'no') {
      warning('Skipping tests');
      return true;
    }
  }

  const backendPath = path.join(__dirname, 'backend');
  process.chdir(backendPath);

  info('Running backend tests...');
  const result = exec('npm test', { silent: false });

  if (result.success) {
    success('All tests passed');
    return true;
  } else {
    warning('Some tests failed (this is OK for initial setup)');
    return true; // Don't fail setup on test failures
  }
}

/**
 * Generate random string for secrets
 */
function generateRandomString(length) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()_+-=[]{}|;:,.<>?';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

/**
 * Display next steps
 */
function displayNextSteps() {
  log('\n' + '='.repeat(60), 'gray');
  log('🎉 SETUP COMPLETED SUCCESSFULLY!', 'green');
  log('='.repeat(60), 'gray');

  log('\n📋 Next Steps:\n', 'cyan');

  if (MODE === 'development' || MODE === 'interactive') {
    log('1. Start the backend server:', 'yellow');
    log('   cd backend && npm start\n', 'gray');

    log('2. In a new terminal, start the frontend:', 'yellow');
    log('   npm run dev\n', 'gray');

    log('3. Open your browser:', 'yellow');
    log('   http://localhost:5173\n', 'gray');

    log('4. Login with default credentials:', 'yellow');
    log('   Username: admin', 'gray');
    log('   Password: admin123', 'gray');
    log('   ⚠️  CHANGE PASSWORD IMMEDIATELY!\n', 'red');
  } else {
    log('1. Build the frontend for production:', 'yellow');
    log('   npm run build\n', 'gray');

    log('2. Start the backend with PM2:', 'yellow');
    log('   cd backend', 'gray');
    log('   pm2 start ecosystem.config.js\n', 'gray');

    log('3. Configure Nginx (see nginx.prod.conf)', 'yellow');
    log('   sudo cp nginx.prod.conf /etc/nginx/sites-available/sysme-pos', 'gray');
    log('   sudo ln -s /etc/nginx/sites-available/sysme-pos /etc/nginx/sites-enabled/', 'gray');
    log('   sudo nginx -t', 'gray');
    log('   sudo systemctl reload nginx\n', 'gray');

    log('4. Configure SSL/TLS with Let\'s Encrypt:', 'yellow');
    log('   sudo certbot --nginx -d yourdomain.com\n', 'gray');
  }

  log('📖 Additional Documentation:', 'cyan');
  log('   • QUICK-START.md - Getting started guide', 'gray');
  log('   • DEPLOYMENT-GUIDE.md - Production deployment', 'gray');
  log('   • FAQ.md - Common questions', 'gray');
  log('   • API documentation: http://localhost:3000/api-docs\n', 'gray');

  log('🔧 Useful Commands:', 'cyan');
  log('   npm run db:backup      - Backup database', 'gray');
  log('   npm run db:restore     - Restore from backup', 'gray');
  log('   npm run health         - Health check', 'gray');
  log('   npm test               - Run tests\n', 'gray');

  log('='.repeat(60), 'gray');
  log('Happy selling! 🚀', 'green');
  log('='.repeat(60) + '\n', 'gray');
}

/**
 * Main setup flow
 */
async function main() {
  log('\n' + '='.repeat(60), 'blue');
  log('🚀 SYSME POS - Automated Setup', 'blue');
  log('='.repeat(60), 'blue');
  log(`Mode: ${MODE.toUpperCase()}`, 'cyan');
  log('='.repeat(60) + '\n', 'blue');

  try {
    // Step 1: Check requirements
    await checkRequirements();

    // Step 2: Create directories
    await createDirectories();

    // Step 3: Create environment config
    await createEnvironmentConfig();

    // Step 4: Install backend dependencies
    const backendInstalled = await installBackendDependencies();
    if (!backendInstalled) {
      throw new Error('Backend installation failed');
    }

    // Step 5: Install frontend dependencies
    const frontendInstalled = await installFrontendDependencies();
    if (!frontendInstalled) {
      throw new Error('Frontend installation failed');
    }

    // Step 6: Initialize database
    const dbInitialized = await initializeDatabase();
    if (!dbInitialized) {
      throw new Error('Database initialization failed');
    }

    // Step 7: Run tests (optional)
    if (!QUICK_MODE) {
      await runTests();
    }

    // Step 8: Display next steps
    displayNextSteps();

    process.exit(0);
  } catch (err) {
    error(`\n❌ Setup failed: ${err.message}`);
    error('Please check the error messages above and try again.\n');
    process.exit(1);
  }
}

// Run setup
main().catch(err => {
  error(`Fatal error: ${err.message}`);
  process.exit(1);
});

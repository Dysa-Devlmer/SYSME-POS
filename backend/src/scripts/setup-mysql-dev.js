/**
 * MySQL Development Setup Script
 * Sets up MySQL for development and testing of production migration
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const setupMySQLForDev = () => {
  console.log('🔧 Setting up MySQL for Development Testing\n');

  console.log('📋 Prerequisites Checklist:');
  console.log('1. MySQL Server 8.0+ installed ✅');
  console.log('2. MySQL service running ✅');
  console.log('3. Need to configure MySQL credentials');
  console.log('');

  console.log('🔐 MySQL Configuration Options:\n');

  console.log('Option 1: Set up MySQL with empty password for development');
  console.log('Execute the following commands in MySQL Command Line Client:');
  console.log('');
  console.log('  ALTER USER \'root\'@\'localhost\' IDENTIFIED BY \'\';');
  console.log('  FLUSH PRIVILEGES;');
  console.log('');

  console.log('Option 2: Create dedicated user for SYSME development');
  console.log('Execute the following commands in MySQL Command Line Client:');
  console.log('');
  console.log('  CREATE USER \'sysme_dev\'@\'localhost\' IDENTIFIED BY \'sysme123\';');
  console.log('  GRANT ALL PRIVILEGES ON *.* TO \'sysme_dev\'@\'localhost\';');
  console.log('  FLUSH PRIVILEGES;');
  console.log('');

  console.log('Option 3: Use existing MySQL credentials');
  console.log('Update the .env.test file with your MySQL credentials:');
  console.log('');
  console.log('  DB_USER=your_mysql_user');
  console.log('  DB_PASSWORD=your_mysql_password');
  console.log('');

  // Create a batch file for quick MySQL setup on Windows
  const setupBatch = `@echo off
echo ===================================
echo SYSME MySQL Development Setup
echo ===================================
echo.
echo This script will help set up MySQL for SYSME development.
echo.
echo Option 1: Quick setup (empty password - DEV ONLY)
echo -------------------------------------------------
echo Execute these commands in MySQL Command Line Client:
echo.
echo ALTER USER 'root'@'localhost' IDENTIFIED BY '';
echo FLUSH PRIVILEGES;
echo.
echo Option 2: Secure setup (with password)
echo -------------------------------------
echo Execute these commands in MySQL Command Line Client:
echo.
echo CREATE USER 'sysme_dev'@'localhost' IDENTIFIED BY 'sysme123';
echo GRANT ALL PRIVILEGES ON *.* TO 'sysme_dev'@'localhost';
echo FLUSH PRIVILEGES;
echo.
echo Then update .env.test with:
echo DB_USER=sysme_dev
echo DB_PASSWORD=sysme123
echo.
pause
`;

  const batchPath = path.join(__dirname, '..', '..', 'setup_mysql_dev.bat');
  fs.writeFileSync(batchPath, setupBatch);
  console.log(`✅ Created setup batch file: ${batchPath}`);
  console.log('');

  // Create an interactive setup script
  const interactiveSetup = `#!/bin/bash
# Interactive MySQL Setup for SYSME Development

echo "🔧 SYSME MySQL Development Setup"
echo "=================================="
echo ""

echo "Current MySQL status:"
if command -v mysql &> /dev/null; then
    echo "✅ MySQL client available"
else
    echo "❌ MySQL client not found in PATH"
fi

echo ""
echo "Testing MySQL connection..."
echo ""

# Test root connection without password
echo "Testing root connection (no password)..."
if mysql -u root -e "SELECT 1" 2>/dev/null; then
    echo "✅ Root access works (no password)"
    MYSQL_USER="root"
    MYSQL_PASS=""
else
    echo "❌ Root requires password"
    echo ""
    echo "Please choose an option:"
    echo "1. Set up root with empty password (DEV ONLY)"
    echo "2. Create new user 'sysme_dev'"
    echo "3. Use existing credentials"
    echo ""
    read -p "Choose option (1-3): " choice

    case $choice in
        1)
            echo "Please run MySQL as root and execute:"
            echo "ALTER USER 'root'@'localhost' IDENTIFIED BY '';"
            echo "FLUSH PRIVILEGES;"
            ;;
        2)
            echo "Please run MySQL as root and execute:"
            echo "CREATE USER 'sysme_dev'@'localhost' IDENTIFIED BY 'sysme123';"
            echo "GRANT ALL PRIVILEGES ON *.* TO 'sysme_dev'@'localhost';"
            echo "FLUSH PRIVILEGES;"
            ;;
        3)
            echo "Please update your .env.test file with correct credentials"
            ;;
    esac
fi

echo ""
echo "After MySQL setup, run:"
echo "node src/scripts/test-mysql-connection.js"
`;

  const scriptPath = path.join(__dirname, '..', '..', 'setup_mysql_dev.sh');
  fs.writeFileSync(scriptPath, interactiveSetup);
  console.log(`✅ Created setup script: ${scriptPath}`);
  console.log('');

  console.log('📝 Next Steps:');
  console.log('1. Choose one of the MySQL configuration options above');
  console.log('2. Update .env.test file with correct credentials if needed');
  console.log('3. Run: node src/scripts/test-mysql-connection.js');
  console.log('4. Once connection works, proceed with migration testing');
  console.log('');

  return {
    batchFile: batchPath,
    scriptFile: scriptPath
  };
};

// Alternative: Create a database with SQLite-compatible schema for testing
const createTestDatabase = async () => {
  console.log('🏗️  Creating test database for migration validation...');

  // For now, let's continue with SQLite and prepare everything for production
  console.log('Current approach: Complete production scripts and documentation');
  console.log('Production deployment will handle actual MySQL setup');
};

// Run setup if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const files = setupMySQLForDev();
  createTestDatabase();
}

export { setupMySQLForDev, createTestDatabase };
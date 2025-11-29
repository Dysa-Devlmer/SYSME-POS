#!/usr/bin/env node
/**
 * SYSME 2.0 - Agente de Validación Propio
 * Valida sincronización entre BD, Backend y Frontend
 * Uso: node validation-agent.js
 */

import fetch from 'node-fetch';
import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import chalk from 'chalk';

const BACKEND_URL = 'http://127.0.0.1:47851';
const FRONTEND_URL = 'http://127.0.0.1:23847';
const DB_PATH = './backend/data/sysme.db';

class ValidationAgent {
  constructor() {
    this.results = {
      database: [],
      backend: [],
      frontend: [],
      integration: []
    };
    this.passed = 0;
    this.failed = 0;
  }

  log(type, message, status = 'info') {
    const symbols = {
      success: chalk.green('✓'),
      error: chalk.red('✗'),
      info: chalk.blue('ℹ'),
      warning: chalk.yellow('⚠')
    };

    console.log(`${symbols[status]} ${message}`);
  }

  async validateDatabase() {
    this.log('info', '\n🗄️  VALIDANDO BASE DE DATOS...', 'info');

    try {
      const db = await open({
        filename: DB_PATH,
        driver: sqlite3.Database
      });

      // 1. Verificar tablas existentes
      const tables = await db.all(
        "SELECT name FROM sqlite_master WHERE type='table' ORDER BY name"
      );

      this.log('info', `Tablas encontradas: ${tables.length}`, 'info');
      tables.forEach(t => console.log(`  - ${t.name}`));

      // 2. Verificar usuarios
      const users = await db.all('SELECT id, username, role FROM users');
      this.log('info', `Usuarios en BD: ${users.length}`, users.length > 0 ? 'success' : 'error');
      this.results.database.push({ test: 'Usuarios en BD', passed: users.length > 0 });
      users.length > 0 ? this.passed++ : this.failed++;

      // 3. Verificar productos
      const products = await db.all('SELECT id, name, price FROM products LIMIT 5');
      this.log('info', `Productos en BD: ${products.length}`, products.length > 0 ? 'success' : 'error');
      this.results.database.push({ test: 'Productos en BD', passed: products.length > 0 });
      products.length > 0 ? this.passed++ : this.failed++;

      // 4. Verificar mesas
      const tables_data = await db.all('SELECT id, table_number, status FROM tables LIMIT 5');
      this.log('info', `Mesas en BD: ${tables_data.length}`, tables_data.length > 0 ? 'success' : 'error');
      this.results.database.push({ test: 'Mesas en BD', passed: tables_data.length > 0 });
      tables_data.length > 0 ? this.passed++ : this.failed++;

      // 5. Verificar columnas de usuarios
      const userColumns = await db.all("PRAGMA table_info(users)");
      const requiredColumns = ['last_login_at', 'last_login_ip', 'failed_login_attempts', 'locked_until'];
      const hasAllColumns = requiredColumns.every(col =>
        userColumns.some(c => c.name === col)
      );

      this.log('info', 'Columnas de seguridad en users', hasAllColumns ? 'success' : 'error');
      this.results.database.push({ test: 'Columnas de seguridad', passed: hasAllColumns });
      hasAllColumns ? this.passed++ : this.failed++;

      await db.close();

    } catch (error) {
      this.log('error', `Error en BD: ${error.message}`, 'error');
      this.failed++;
      this.results.database.push({ test: 'Conexión BD', passed: false, error: error.message });
    }
  }

  async validateBackend() {
    this.log('info', '\n🖥️  VALIDANDO BACKEND...', 'info');

    // 1. Health check
    try {
      const health = await fetch(`${BACKEND_URL}/health`);
      const healthData = await health.json();

      const healthOk = health.ok && healthData.status === 'OK';
      this.log('info', `Health check: ${healthData.status}`, healthOk ? 'success' : 'error');
      this.results.backend.push({ test: 'Health Check', passed: healthOk });
      healthOk ? this.passed++ : this.failed++;

    } catch (error) {
      this.log('error', 'Backend no responde', 'error');
      this.failed++;
      this.results.backend.push({ test: 'Backend disponible', passed: false });
      return;
    }

    // 2. Login
    try {
      const loginRes = await fetch(`${BACKEND_URL}/api/v1/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: 'admin', password: 'admin2024' })
      });

      const loginData = await loginRes.json();
      const loginOk = loginRes.ok && loginData.success && loginData.data.accessToken;

      this.log('info', 'Login con credenciales', loginOk ? 'success' : 'error');
      this.results.backend.push({ test: 'Autenticación', passed: loginOk });
      loginOk ? this.passed++ : this.failed++;

      if (!loginOk) return;

      const token = loginData.data.accessToken;

      // 3. Obtener productos
      const productsRes = await fetch(`${BACKEND_URL}/api/v1/products`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      const productsOk = productsRes.ok;
      this.log('info', 'API Productos', productsOk ? 'success' : 'error');
      this.results.backend.push({ test: 'API Productos', passed: productsOk });
      productsOk ? this.passed++ : this.failed++;

      // 4. Obtener mesas
      const tablesRes = await fetch(`${BACKEND_URL}/api/v1/tables`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      const tablesOk = tablesRes.ok;
      this.log('info', 'API Mesas', tablesOk ? 'success' : 'error');
      this.results.backend.push({ test: 'API Mesas', passed: tablesOk });
      tablesOk ? this.passed++ : this.failed++;

      // 5. Obtener usuario actual
      const meRes = await fetch(`${BACKEND_URL}/api/v1/auth/me`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      const meOk = meRes.ok;
      this.log('info', 'API Usuario actual', meOk ? 'success' : 'error');
      this.results.backend.push({ test: 'API Usuario', passed: meOk });
      meOk ? this.passed++ : this.failed++;

    } catch (error) {
      this.log('error', `Error en Backend: ${error.message}`, 'error');
      this.failed++;
    }
  }

  async validateFrontend() {
    this.log('info', '\n🌐 VALIDANDO FRONTEND...', 'info');

    try {
      const frontendRes = await fetch(FRONTEND_URL);
      const frontendOk = frontendRes.ok;

      this.log('info', `Frontend accesible en ${FRONTEND_URL}`, frontendOk ? 'success' : 'error');
      this.results.frontend.push({ test: 'Frontend disponible', passed: frontendOk });
      frontendOk ? this.passed++ : this.failed++;

      if (frontendOk) {
        const html = await frontendRes.text();
        const hasReact = html.includes('root') || html.includes('React');

        this.log('info', 'Estructura React detectada', hasReact ? 'success' : 'warning');
        this.results.frontend.push({ test: 'Estructura React', passed: hasReact });
        hasReact ? this.passed++ : this.failed++;
      }

    } catch (error) {
      this.log('error', 'Frontend no disponible', 'error');
      this.failed++;
      this.results.frontend.push({ test: 'Frontend disponible', passed: false });
    }
  }

  async validateIntegration() {
    this.log('info', '\n🔗 VALIDANDO INTEGRACIÓN...', 'info');

    // Verificar que datos de BD estén disponibles en Backend
    try {
      // Login
      const loginRes = await fetch(`${BACKEND_URL}/api/v1/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: 'admin', password: 'admin2024' })
      });

      if (!loginRes.ok) {
        this.log('error', 'No se puede autenticar para pruebas de integración', 'error');
        this.failed++;
        return;
      }

      const loginData = await loginRes.json();
      const token = loginData.data.accessToken;

      // Verificar que productos de BD estén en API
      const db = await open({
        filename: DB_PATH,
        driver: sqlite3.Database
      });

      const dbProducts = await db.all('SELECT COUNT(*) as count FROM products');
      const dbProductCount = dbProducts[0].count;

      const apiProducts = await fetch(`${BACKEND_URL}/api/v1/products`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      const apiProductsData = await apiProducts.json();
      const apiProductCount = apiProductsData.data?.products ? apiProductsData.data.products.length : 0;

      const syncOk = apiProductCount === dbProductCount;
      this.log('info', `Sync Productos: BD(${dbProductCount}) === API(${apiProductCount})`, syncOk ? 'success' : 'warning');
      this.results.integration.push({
        test: 'Sincronización BD-Backend',
        passed: syncOk,
        details: `BD: ${dbProductCount}, API: ${apiProductCount}`
      });
      syncOk ? this.passed++ : this.failed++;

      await db.close();

    } catch (error) {
      this.log('error', `Error en integración: ${error.message}`, 'error');
      this.failed++;
      this.results.integration.push({
        test: 'Integración BD-Backend',
        passed: false,
        error: error.message
      });
    }
  }

  generateReport() {
    console.log(chalk.bold('\n\n📊 REPORTE DE VALIDACIÓN\n'));
    console.log('='.repeat(60));

    console.log(chalk.bold('\n1. BASE DE DATOS:'));
    this.results.database.forEach(r => {
      console.log(`  ${r.passed ? chalk.green('✓') : chalk.red('✗')} ${r.test}`);
    });

    console.log(chalk.bold('\n2. BACKEND:'));
    this.results.backend.forEach(r => {
      console.log(`  ${r.passed ? chalk.green('✓') : chalk.red('✗')} ${r.test}`);
    });

    console.log(chalk.bold('\n3. FRONTEND:'));
    this.results.frontend.forEach(r => {
      console.log(`  ${r.passed ? chalk.green('✓') : chalk.red('✗')} ${r.test}`);
    });

    console.log(chalk.bold('\n4. INTEGRACIÓN:'));
    this.results.integration.forEach(r => {
      console.log(`  ${r.passed ? chalk.green('✓') : chalk.red('✗')} ${r.test}`);
      if (r.details) console.log(`    ${chalk.gray(r.details)}`);
    });

    console.log('\n' + '='.repeat(60));
    console.log(chalk.bold('\nRESUMEN:'));
    console.log(chalk.green(`  ✓ Pruebas exitosas: ${this.passed}`));
    console.log(chalk.red(`  ✗ Pruebas fallidas: ${this.failed}`));

    const total = this.passed + this.failed;
    const percentage = total > 0 ? ((this.passed / total) * 100).toFixed(1) : 0;
    console.log(chalk.bold(`\n  COBERTURA: ${percentage}%`));

    if (this.failed === 0) {
      console.log(chalk.green.bold('\n✅ SISTEMA VALIDADO - TODO FUNCIONA CORRECTAMENTE\n'));
    } else {
      console.log(chalk.yellow.bold('\n⚠️  SISTEMA PARCIALMENTE FUNCIONAL - HAY PROBLEMAS\n'));
    }
  }

  async run() {
    console.log(chalk.bold.cyan('\n🚀 INICIANDO VALIDACIÓN DE SISTEMA SYSME 2.0\n'));

    await this.validateDatabase();
    await this.validateBackend();
    await this.validateFrontend();
    await this.validateIntegration();

    this.generateReport();
  }
}

// Ejecutar validación
const agent = new ValidationAgent();
agent.run().catch(error => {
  console.error(chalk.red('❌ Error fatal:'), error);
  process.exit(1);
});

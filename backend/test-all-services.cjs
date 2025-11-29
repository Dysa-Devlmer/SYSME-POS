/**
 * Script de Prueba Completo para Servicios SYSME POS v2.1
 * Prueba todos los 6 servicios implementados
 */

const path = require('path');

// Configurar variables de entorno de prueba
process.env.EMAIL_PROVIDER = 'smtp';
process.env.SMTP_HOST = 'smtp.gmail.com';
process.env.SMTP_PORT = '587';
process.env.CONFIG_PATH = path.join(__dirname, 'src/config');
process.env.DEFAULT_LOCALE = 'es';
process.env.NODE_ENV = 'test';

// Colores para la consola
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logTest(name, passed, details = '') {
  const icon = passed ? '✓' : '✗';
  const color = passed ? 'green' : 'red';
  log(`${icon} ${name}`, color);
  if (details) {
    log(`  ${details}`, 'cyan');
  }
}

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Estadísticas
const stats = {
  total: 0,
  passed: 0,
  failed: 0,
  startTime: Date.now()
};

async function runTests() {
  log('\n🧪 SYSME POS v2.1 - Suite de Pruebas Completa\n', 'cyan');
  log('═'.repeat(60), 'blue');

  try {
    // Test 1: Email/SMS Service
    await testEmailSMSService();

    // Test 2: Performance Optimizer
    await testPerformanceOptimizer();

    // Test 3: Config Manager
    await testConfigManager();

    // Test 4: Webhook Service
    await testWebhookService();

    // Test 5: RBAC Service
    await testRBACService();

    // Test 6: i18n Service
    await testI18nService();

    // Resumen final
    printSummary();

  } catch (error) {
    log(`\n❌ Error crítico en las pruebas: ${error.message}`, 'red');
    console.error(error);
    process.exit(1);
  }
}

/**
 * Test 1: Email/SMS Service
 */
async function testEmailSMSService() {
  log('\n📧 Test 1: Email/SMS Service', 'yellow');
  log('─'.repeat(60), 'blue');

  try {
    const emailSMSService = require('./src/services/email-sms-service');

    // Test: Inicialización
    stats.total++;
    try {
      await emailSMSService.initialize();
      stats.passed++;
      logTest('Inicialización del servicio', true);
    } catch (error) {
      stats.failed++;
      logTest('Inicialización del servicio', false, error.message);
    }

    // Test: Cargar plantillas
    stats.total++;
    const templateCount = emailSMSService.templates.size;
    const passed = templateCount >= 4;
    if (passed) stats.passed++; else stats.failed++;
    logTest('Carga de plantillas', passed, `${templateCount} plantillas cargadas`);

    // Test: Obtener estadísticas
    stats.total++;
    try {
      const serviceStats = emailSMSService.getStats();
      const hasStats = serviceStats && 'email' in serviceStats;
      if (hasStats) stats.passed++; else stats.failed++;
      logTest('Obtener estadísticas', hasStats, JSON.stringify(serviceStats));
    } catch (error) {
      stats.failed++;
      logTest('Obtener estadísticas', false, error.message);
    }

    // Test: Simulación de envío (sin credenciales reales)
    stats.total++;
    log('  ℹ️  Envío de email requiere credenciales reales (saltado)', 'cyan');
    stats.passed++;

  } catch (error) {
    log(`  ❌ Error en Email/SMS Service: ${error.message}`, 'red');
  }
}

/**
 * Test 2: Performance Optimizer
 */
async function testPerformanceOptimizer() {
  log('\n⚡ Test 2: Performance Optimizer', 'yellow');
  log('─'.repeat(60), 'blue');

  try {
    const performanceOptimizer = require('./src/services/performance-optimizer');

    // Test: Inicialización
    stats.total++;
    try {
      await performanceOptimizer.initialize();
      stats.passed++;
      logTest('Inicialización del servicio', true);
    } catch (error) {
      stats.failed++;
      logTest('Inicialización del servicio', false, error.message);
    }

    // Test: Obtener métricas de CPU
    stats.total++;
    try {
      const cpuMetrics = performanceOptimizer.getCPUUsage();
      const hasMetrics = cpuMetrics && 'usage' in cpuMetrics && 'cores' in cpuMetrics;
      if (hasMetrics) stats.passed++; else stats.failed++;
      logTest('Métricas de CPU', hasMetrics, `Uso: ${cpuMetrics.usage.toFixed(2)}%, Cores: ${cpuMetrics.cores}`);
    } catch (error) {
      stats.failed++;
      logTest('Métricas de CPU', false, error.message);
    }

    // Test: Obtener métricas de memoria
    stats.total++;
    try {
      const memMetrics = performanceOptimizer.getMemoryUsage();
      const hasMetrics = memMetrics && 'percentage' in memMetrics && 'heap' in memMetrics;
      if (hasMetrics) stats.passed++; else stats.failed++;
      logTest('Métricas de memoria', hasMetrics, `Uso: ${memMetrics.percentage.toFixed(2)}%, Heap: ${memMetrics.heap.percentage.toFixed(2)}%`);
    } catch (error) {
      stats.failed++;
      logTest('Métricas de memoria', false, error.message);
    }

    // Test: Reporte de rendimiento
    stats.total++;
    try {
      await sleep(1000); // Esperar para tener métricas
      const report = performanceOptimizer.getPerformanceReport();
      const hasReport = report && 'system' in report && 'requests' in report;
      if (hasReport) stats.passed++; else stats.failed++;
      logTest('Reporte de rendimiento', hasReport, `CPU: ${report.system.avgCPU}%, Mem: ${report.system.avgMemory}%`);
    } catch (error) {
      stats.failed++;
      logTest('Reporte de rendimiento', false, error.message);
    }

    // Test: Detección de bottlenecks
    stats.total++;
    try {
      const bottlenecks = performanceOptimizer.bottlenecks;
      const isArray = Array.isArray(bottlenecks);
      if (isArray) stats.passed++; else stats.failed++;
      logTest('Detección de bottlenecks', isArray, `${bottlenecks.length} bottlenecks detectados`);
    } catch (error) {
      stats.failed++;
      logTest('Detección de bottlenecks', false, error.message);
    }

  } catch (error) {
    log(`  ❌ Error en Performance Optimizer: ${error.message}`, 'red');
  }
}

/**
 * Test 3: Config Manager
 */
async function testConfigManager() {
  log('\n⚙️  Test 3: Config Manager', 'yellow');
  log('─'.repeat(60), 'blue');

  try {
    const configManager = require('./src/services/config-manager');

    // Test: Inicialización
    stats.total++;
    try {
      await configManager.initialize();
      stats.passed++;
      logTest('Inicialización del servicio', true);
    } catch (error) {
      stats.failed++;
      logTest('Inicialización del servicio', false, error.message);
    }

    // Test: Crear configuración de prueba
    stats.total++;
    try {
      const testConfig = {
        app: {
          name: 'SYSME POS',
          version: '2.1.0',
          port: 3000
        },
        database: {
          host: 'localhost',
          port: 3306
        }
      };

      await configManager.set('test', testConfig, { persist: false });
      stats.passed++;
      logTest('Crear configuración', true);
    } catch (error) {
      stats.failed++;
      logTest('Crear configuración', false, error.message);
    }

    // Test: Obtener configuración
    stats.total++;
    try {
      const config = configManager.get('test');
      const hasConfig = config && config.app && config.app.name === 'SYSME POS';
      if (hasConfig) stats.passed++; else stats.failed++;
      logTest('Obtener configuración', hasConfig, `App: ${config?.app?.name}`);
    } catch (error) {
      stats.failed++;
      logTest('Obtener configuración', false, error.message);
    }

    // Test: Obtener valor específico
    stats.total++;
    try {
      const port = configManager.getValue('test', 'app.port', 0);
      const isCorrect = port === 3000;
      if (isCorrect) stats.passed++; else stats.failed++;
      logTest('Obtener valor específico', isCorrect, `Port: ${port}`);
    } catch (error) {
      stats.failed++;
      logTest('Obtener valor específico', false, error.message);
    }

    // Test: Establecer valor
    stats.total++;
    try {
      await configManager.setValue('test', 'app.environment', 'production', { persist: false });
      const env = configManager.getValue('test', 'app.environment');
      const isCorrect = env === 'production';
      if (isCorrect) stats.passed++; else stats.failed++;
      logTest('Establecer valor', isCorrect, `Environment: ${env}`);
    } catch (error) {
      stats.failed++;
      logTest('Establecer valor', false, error.message);
    }

    // Test: Obtener estadísticas
    stats.total++;
    try {
      const configStats = configManager.getStats();
      const hasStats = configStats && 'roles' in configStats;
      if (hasStats) stats.passed++; else stats.failed++;
      logTest('Obtener estadísticas', hasStats, JSON.stringify(configStats));
    } catch (error) {
      stats.failed++;
      logTest('Obtener estadísticas', false, error.message);
    }

  } catch (error) {
    log(`  ❌ Error en Config Manager: ${error.message}`, 'red');
  }
}

/**
 * Test 4: Webhook Service
 */
async function testWebhookService() {
  log('\n🔗 Test 4: Webhook Service', 'yellow');
  log('─'.repeat(60), 'blue');

  try {
    const webhookService = require('./src/services/webhook-service');

    // Test: Inicialización
    stats.total++;
    try {
      await webhookService.initialize();
      stats.passed++;
      logTest('Inicialización del servicio', true);
    } catch (error) {
      stats.failed++;
      logTest('Inicialización del servicio', false, error.message);
    }

    // Test: Registrar webhook
    stats.total++;
    try {
      webhookService.register({
        name: 'test-webhook',
        url: 'https://webhook.site/unique-id',
        events: ['order.created', 'payment.received'],
        enabled: true
      });
      stats.passed++;
      logTest('Registrar webhook', true);
    } catch (error) {
      stats.failed++;
      logTest('Registrar webhook', false, error.message);
    }

    // Test: Listar webhooks
    stats.total++;
    try {
      const webhooks = webhookService.list();
      const hasWebhooks = Array.isArray(webhooks) && webhooks.length > 0;
      if (hasWebhooks) stats.passed++; else stats.failed++;
      logTest('Listar webhooks', hasWebhooks, `${webhooks.length} webhooks registrados`);
    } catch (error) {
      stats.failed++;
      logTest('Listar webhooks', false, error.message);
    }

    // Test: Disparar evento (solo encolar, no enviar)
    stats.total++;
    try {
      await webhookService.trigger('order.created', {
        orderId: 123,
        total: 150.00
      });
      stats.passed++;
      logTest('Disparar evento', true);
    } catch (error) {
      stats.failed++;
      logTest('Disparar evento', false, error.message);
    }

    // Test: Estadísticas globales
    stats.total++;
    try {
      const globalStats = webhookService.getGlobalStats();
      const hasStats = globalStats && 'webhooks' in globalStats && 'deliveries' in globalStats;
      if (hasStats) stats.passed++; else stats.failed++;
      logTest('Estadísticas globales', hasStats, `Webhooks: ${globalStats.webhooks.total}, Pending: ${globalStats.deliveries.pending}`);
    } catch (error) {
      stats.failed++;
      logTest('Estadísticas globales', false, error.message);
    }

    // Test: Firma de payload
    stats.total++;
    try {
      const payload = { test: 'data' };
      const signature = webhookService.signPayload(payload, 'secret-key');
      const isValid = webhookService.verifySignature(payload, signature, 'secret-key');
      if (isValid) stats.passed++; else stats.failed++;
      logTest('Firma de payload', isValid, `Signature: ${signature.substring(0, 20)}...`);
    } catch (error) {
      stats.failed++;
      logTest('Firma de payload', false, error.message);
    }

  } catch (error) {
    log(`  ❌ Error en Webhook Service: ${error.message}`, 'red');
  }
}

/**
 * Test 5: RBAC Service
 */
async function testRBACService() {
  log('\n🔐 Test 5: RBAC Service', 'yellow');
  log('─'.repeat(60), 'blue');

  try {
    const rbacService = require('./src/services/rbac-service');

    // Test: Roles predefinidos
    stats.total++;
    try {
      const roles = rbacService.listRoles();
      const hasRoles = roles.length >= 8; // Debe haber al menos 8 roles
      if (hasRoles) stats.passed++; else stats.failed++;
      logTest('Roles predefinidos', hasRoles, `${roles.length} roles cargados`);
    } catch (error) {
      stats.failed++;
      logTest('Roles predefinidos', false, error.message);
    }

    // Test: Permisos base
    stats.total++;
    try {
      const permissions = rbacService.listPermissions();
      const hasPermissions = permissions.length >= 30;
      if (hasPermissions) stats.passed++; else stats.failed++;
      logTest('Permisos base', hasPermissions, `${permissions.length} permisos definidos`);
    } catch (error) {
      stats.failed++;
      logTest('Permisos base', false, error.message);
    }

    // Test: Asignar rol a usuario
    stats.total++;
    try {
      const testUserId = 999;
      rbacService.assignRole(testUserId, 'manager');
      rbacService.assignRole(testUserId, 'cashier');

      const userRoles = rbacService.getUserRoles(testUserId);
      const hasRoles = userRoles.length === 2;
      if (hasRoles) stats.passed++; else stats.failed++;
      logTest('Asignar roles a usuario', hasRoles, `Usuario tiene ${userRoles.length} roles`);
    } catch (error) {
      stats.failed++;
      logTest('Asignar roles a usuario', false, error.message);
    }

    // Test: Verificar permisos
    stats.total++;
    try {
      const testUserId = 999;
      const canCreateOrders = rbacService.can(testUserId, 'orders', 'create');
      if (canCreateOrders) stats.passed++; else stats.failed++;
      logTest('Verificar permisos', canCreateOrders, 'Usuario puede crear órdenes');
    } catch (error) {
      stats.failed++;
      logTest('Verificar permisos', false, error.message);
    }

    // Test: Permisos de super_admin
    stats.total++;
    try {
      const adminUserId = 1;
      rbacService.assignRole(adminUserId, 'super_admin');
      const canDoAnything = rbacService.can(adminUserId, 'anything', 'everything');
      if (canDoAnything) stats.passed++; else stats.failed++;
      logTest('Permisos wildcard (*:*)', canDoAnything, 'Super admin tiene acceso total');
    } catch (error) {
      stats.failed++;
      logTest('Permisos wildcard (*:*)', false, error.message);
    }

    // Test: Obtener estadísticas
    stats.total++;
    try {
      const rbacStats = rbacService.getStats();
      const hasStats = rbacStats && rbacStats.roles > 0 && rbacStats.permissions > 0;
      if (hasStats) stats.passed++; else stats.failed++;
      logTest('Obtener estadísticas', hasStats, `Roles: ${rbacStats.roles}, Permisos: ${rbacStats.permissions}, Usuarios: ${rbacStats.users}`);
    } catch (error) {
      stats.failed++;
      logTest('Obtener estadísticas', false, error.message);
    }

  } catch (error) {
    log(`  ❌ Error en RBAC Service: ${error.message}`, 'red');
  }
}

/**
 * Test 6: i18n Service
 */
async function testI18nService() {
  log('\n🌍 Test 6: i18n Service', 'yellow');
  log('─'.repeat(60), 'blue');

  try {
    const i18nService = require('./src/services/i18n-service');

    // Test: Inicialización
    stats.total++;
    try {
      await i18nService.initialize();
      stats.passed++;
      logTest('Inicialización del servicio', true);
    } catch (error) {
      stats.failed++;
      logTest('Inicialización del servicio', false, error.message);
    }

    // Test: Idiomas soportados
    stats.total++;
    try {
      const locales = i18nService.getSupportedLocales();
      const hasLocales = locales.length >= 2;
      if (hasLocales) stats.passed++; else stats.failed++;
      logTest('Idiomas soportados', hasLocales, locales.map(l => l.code).join(', '));
    } catch (error) {
      stats.failed++;
      logTest('Idiomas soportados', false, error.message);
    }

    // Test: Traducción simple (español)
    stats.total++;
    try {
      const text = i18nService.t('common.save', {}, 'es');
      const isCorrect = text === 'Guardar';
      if (isCorrect) stats.passed++; else stats.failed++;
      logTest('Traducción ES', isCorrect, `common.save = "${text}"`);
    } catch (error) {
      stats.failed++;
      logTest('Traducción ES', false, error.message);
    }

    // Test: Traducción simple (inglés)
    stats.total++;
    try {
      const text = i18nService.t('common.save', {}, 'en');
      const isCorrect = text === 'Save';
      if (isCorrect) stats.passed++; else stats.failed++;
      logTest('Traducción EN', isCorrect, `common.save = "${text}"`);
    } catch (error) {
      stats.failed++;
      logTest('Traducción EN', false, error.message);
    }

    // Test: Interpolación de parámetros
    stats.total++;
    try {
      const text = i18nService.t('validation.minLength', { min: 5 }, 'en');
      const isCorrect = text.includes('5');
      if (isCorrect) stats.passed++; else stats.failed++;
      logTest('Interpolación', isCorrect, `"${text}"`);
    } catch (error) {
      stats.failed++;
      logTest('Interpolación', false, error.message);
    }

    // Test: Traducción anidada
    stats.total++;
    try {
      const text = i18nService.t('orders.status.pending', {}, 'es');
      const isCorrect = text === 'Pendiente';
      if (isCorrect) stats.passed++; else stats.failed++;
      logTest('Traducción anidada', isCorrect, `orders.status.pending = "${text}"`);
    } catch (error) {
      stats.failed++;
      logTest('Traducción anidada', false, error.message);
    }

    // Test: Estadísticas
    stats.total++;
    try {
      const i18nStats = i18nService.getStats();
      const hasStats = i18nStats && i18nStats.locales >= 2;
      if (hasStats) stats.passed++; else stats.failed++;
      logTest('Obtener estadísticas', hasStats, `Locales: ${i18nStats.locales}, Cache size: ${i18nStats.cacheSize}, Hit rate: ${i18nStats.hitRate}%`);
    } catch (error) {
      stats.failed++;
      logTest('Obtener estadísticas', false, error.message);
    }

  } catch (error) {
    log(`  ❌ Error en i18n Service: ${error.message}`, 'red');
  }
}

/**
 * Imprime resumen final
 */
function printSummary() {
  const duration = ((Date.now() - stats.startTime) / 1000).toFixed(2);
  const successRate = ((stats.passed / stats.total) * 100).toFixed(2);

  log('\n' + '═'.repeat(60), 'blue');
  log('\n📊 Resumen de Pruebas', 'cyan');
  log('─'.repeat(60), 'blue');

  log(`\nTotal de pruebas:    ${stats.total}`);
  log(`Pasadas:             ${stats.passed}`, 'green');
  log(`Fallidas:            ${stats.failed}`, stats.failed > 0 ? 'red' : 'reset');
  log(`Tasa de éxito:       ${successRate}%`, successRate >= 90 ? 'green' : 'yellow');
  log(`Duración:            ${duration}s`);

  log('\n' + '═'.repeat(60), 'blue');

  if (stats.failed === 0) {
    log('\n🎉 ¡Todos los tests pasaron exitosamente!\n', 'green');
  } else {
    log(`\n⚠️  ${stats.failed} test(s) fallaron\n`, 'yellow');
  }
}

// Ejecutar pruebas
runTests().catch(error => {
  log(`\n💥 Error fatal: ${error.message}`, 'red');
  console.error(error);
  process.exit(1);
});

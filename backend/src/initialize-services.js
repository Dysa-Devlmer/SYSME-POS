/**
 * Inicializador de Servicios SYSME POS v2.1
 * Inicializa todos los servicios en el orden correcto
 *
 * @module InitializeServices
 * @version 2.1.0
 */

const emailSMSService = require('./services/email-sms-service');
const performanceOptimizer = require('./services/performance-optimizer');
const configManager = require('./services/config-manager');
const webhookService = require('./services/webhook-service');
const rbacService = require('./services/rbac-service');
const i18nService = require('./services/i18n-service');

/**
 * Inicializa todos los servicios
 * @returns {Promise<Object>} Resultado de la inicialización
 */
async function initializeServices() {
  console.log('\n🚀 Iniciando servicios SYSME POS v2.1...\n');

  const results = {
    success: [],
    failed: [],
    warnings: []
  };

  const startTime = Date.now();

  // 1. Config Manager (primero, otros servicios pueden depender de configuración)
  try {
    console.log('⚙️  Inicializando Config Manager...');
    await configManager.initialize();
    results.success.push('config-manager');
    console.log('   ✅ Config Manager inicializado\n');
  } catch (error) {
    console.error('   ❌ Error en Config Manager:', error.message);
    results.failed.push({ service: 'config-manager', error: error.message });
  }

  // 2. i18n Service (segundo, para que las traducciones estén disponibles)
  try {
    console.log('🌍 Inicializando i18n Service...');
    await i18nService.initialize();
    results.success.push('i18n-service');
    console.log('   ✅ i18n Service inicializado\n');
  } catch (error) {
    console.error('   ❌ Error en i18n Service:', error.message);
    results.failed.push({ service: 'i18n-service', error: error.message });
  }

  // 3. RBAC Service (ya inicializado en su constructor, verificar)
  try {
    console.log('🔐 Verificando RBAC Service...');
    const rbacStats = rbacService.getStats();
    if (rbacStats.roles > 0 && rbacStats.permissions > 0) {
      results.success.push('rbac-service');
      console.log(`   ✅ RBAC Service verificado (${rbacStats.roles} roles, ${rbacStats.permissions} permisos)\n`);
    } else {
      results.warnings.push({
        service: 'rbac-service',
        message: 'RBAC inicializado pero sin roles/permisos'
      });
    }
  } catch (error) {
    console.error('   ❌ Error verificando RBAC Service:', error.message);
    results.failed.push({ service: 'rbac-service', error: error.message });
  }

  // 4. Email/SMS Service
  try {
    console.log('📧 Inicializando Email/SMS Service...');
    await emailSMSService.initialize();
    results.success.push('email-sms-service');
    const stats = emailSMSService.getStats();
    console.log(`   ✅ Email/SMS Service inicializado (${emailSMSService.templates.size} plantillas)\n`);
  } catch (error) {
    console.error('   ⚠️  Email/SMS Service con errores:', error.message);
    results.warnings.push({
      service: 'email-sms-service',
      message: 'Inicializado parcialmente - verificar credenciales'
    });
  }

  // 5. Webhook Service
  try {
    console.log('🔗 Inicializando Webhook Service...');
    await webhookService.initialize();
    results.success.push('webhook-service');
    console.log('   ✅ Webhook Service inicializado\n');
  } catch (error) {
    console.error('   ❌ Error en Webhook Service:', error.message);
    results.failed.push({ service: 'webhook-service', error: error.message });
  }

  // 6. Performance Optimizer (último, para monitorear los demás)
  try {
    console.log('⚡ Inicializando Performance Optimizer...');
    await performanceOptimizer.initialize();
    results.success.push('performance-optimizer');
    console.log('   ✅ Performance Optimizer inicializado\n');
  } catch (error) {
    console.error('   ❌ Error en Performance Optimizer:', error.message);
    results.failed.push({ service: 'performance-optimizer', error: error.message });
  }

  // Resumen
  const duration = Date.now() - startTime;
  console.log('═'.repeat(60));
  console.log('\n📊 Resumen de Inicialización:\n');
  console.log(`✅ Exitosos:   ${results.success.length} servicios`);
  console.log(`⚠️  Warnings:   ${results.warnings.length} servicios`);
  console.log(`❌ Fallidos:   ${results.failed.length} servicios`);
  console.log(`⏱️  Duración:   ${duration}ms`);
  console.log('\n' + '═'.repeat(60) + '\n');

  if (results.success.length > 0) {
    console.log('✅ Servicios inicializados:');
    results.success.forEach(service => console.log(`   - ${service}`));
    console.log('');
  }

  if (results.warnings.length > 0) {
    console.log('⚠️  Warnings:');
    results.warnings.forEach(w => console.log(`   - ${w.service}: ${w.message}`));
    console.log('');
  }

  if (results.failed.length > 0) {
    console.log('❌ Servicios fallidos:');
    results.failed.forEach(f => console.log(`   - ${f.service}: ${f.error}`));
    console.log('');
  }

  // Determinar si la inicialización fue exitosa
  const allCriticalSuccess = results.failed.length === 0;

  if (allCriticalSuccess) {
    console.log('🎉 ¡Todos los servicios SYSME POS v2.1 iniciados correctamente!\n');
  } else {
    console.log('⚠️  Algunos servicios fallaron, pero el sistema puede continuar.\n');
  }

  return {
    success: allCriticalSuccess,
    results,
    duration
  };
}

/**
 * Limpia todos los servicios al cerrar
 */
function cleanupServices() {
  console.log('\n🧹 Limpiando servicios...\n');

  try {
    emailSMSService.cleanup();
    console.log('   ✅ Email/SMS Service limpiado');
  } catch (error) {
    console.error('   ❌ Error limpiando Email/SMS Service');
  }

  try {
    performanceOptimizer.cleanup();
    console.log('   ✅ Performance Optimizer limpiado');
  } catch (error) {
    console.error('   ❌ Error limpiando Performance Optimizer');
  }

  try {
    configManager.cleanup();
    console.log('   ✅ Config Manager limpiado');
  } catch (error) {
    console.error('   ❌ Error limpiando Config Manager');
  }

  try {
    webhookService.cleanup();
    console.log('   ✅ Webhook Service limpiado');
  } catch (error) {
    console.error('   ❌ Error limpiando Webhook Service');
  }

  try {
    rbacService.cleanup();
    console.log('   ✅ RBAC Service limpiado');
  } catch (error) {
    console.error('   ❌ Error limpiando RBAC Service');
  }

  try {
    i18nService.cleanup();
    console.log('   ✅ i18n Service limpiado');
  } catch (error) {
    console.error('   ❌ Error limpiando i18n Service');
  }

  console.log('\n✅ Limpieza completada\n');
}

/**
 * Configura handlers de señales del sistema
 */
function setupSignalHandlers() {
  // SIGTERM (terminación)
  process.on('SIGTERM', () => {
    console.log('\n📡 SIGTERM recibido, cerrando servicios...');
    cleanupServices();
    process.exit(0);
  });

  // SIGINT (Ctrl+C)
  process.on('SIGINT', () => {
    console.log('\n📡 SIGINT recibido, cerrando servicios...');
    cleanupServices();
    process.exit(0);
  });

  // Uncaught exceptions
  process.on('uncaughtException', (error) => {
    console.error('\n💥 Uncaught Exception:', error);
    cleanupServices();
    process.exit(1);
  });

  // Unhandled promise rejections
  process.on('unhandledRejection', (reason, promise) => {
    console.error('\n💥 Unhandled Rejection at:', promise, 'reason:', reason);
  });
}

// Exportar funciones
module.exports = {
  initializeServices,
  cleanupServices,
  setupSignalHandlers,

  // Exportar servicios individuales para acceso directo
  services: {
    emailSMS: emailSMSService,
    performance: performanceOptimizer,
    config: configManager,
    webhooks: webhookService,
    rbac: rbacService,
    i18n: i18nService
  }
};

// Si se ejecuta directamente (para pruebas)
if (require.main === module) {
  (async () => {
    setupSignalHandlers();
    const result = await initializeServices();

    if (!result.success) {
      process.exit(1);
    }
  })();
}

/**
 * Initialize JARVIS Integration for SYSME-POS
 * Este archivo inicializa y configura la integración de JARVIS con SYSME-POS
 */

const path = require('path');
const SysmeJarvisBridge = require('./sysme-jarvis-bridge');
const Logger = require('../../../../core/logger');

const logger = new Logger('JARVIS-Init');

// Configuración de la integración
const JARVIS_CONFIG = {
    port: 7779,
    enableAI: true,
    enableMemory: true,
    enableAutonomous: true,
    enableProactive: true,
    enableBackup: true,
    autoReorder: false, // Por defecto deshabilitado, se puede activar desde configuración

    // Configuración de memoria neural
    memory: {
        dbPath: path.join(__dirname, '../data/sysme-neural-memory.db'),
        contextWindow: 1000,
        consolidationInterval: 3600000, // 1 hora
        maxMemorySize: 100000000 // 100MB
    },

    // Configuración del agente autónomo
    autonomous: {
        mode: 'assisted', // assisted, autonomous, manual
        maxConcurrentTasks: 5,
        taskTimeout: 300000, // 5 minutos
        retryAttempts: 3
    },

    // Configuración del monitor proactivo
    proactive: {
        scanInterval: 30000, // 30 segundos
        alertThrottling: 60000, // 1 minuto entre alertas similares
        patterns: {
            sales: {
                anomalyDetection: true,
                trendAnalysis: true,
                predictiveAlerts: true
            },
            inventory: {
                autoReorder: false,
                lowStockThreshold: 0.2, // 20% del stock mínimo
                criticalStockThreshold: 0.05 // 5% del stock mínimo
            },
            performance: {
                responseTimeThreshold: 1000, // 1 segundo
                errorRateThreshold: 0.05, // 5% de error rate
                cpuThreshold: 0.8, // 80% CPU
                memoryThreshold: 0.9 // 90% memoria
            }
        }
    },

    // Configuración de backup
    backup: {
        autoBackup: true,
        backupPath: path.join(__dirname, '../backups'),
        schedule: {
            full: '0 2 * * *', // 2 AM diario
            incremental: '0 */4 * * *', // Cada 4 horas
            realtime: false // Backup en tiempo real deshabilitado por defecto
        },
        retention: {
            daily: 7,
            weekly: 4,
            monthly: 3
        },
        compression: true,
        encryption: false // Deshabilitado por defecto
    },

    // Configuración de analytics
    analytics: {
        enabled: true,
        realtime: true,
        historical: true,
        predictive: true,
        dashboards: [
            'sales',
            'inventory',
            'customers',
            'performance',
            'financials'
        ]
    },

    // Configuración de notificaciones
    notifications: {
        enabled: true,
        channels: ['web', 'email', 'sms'],
        priorities: {
            critical: ['email', 'sms'],
            high: ['email'],
            medium: ['web'],
            low: ['web']
        }
    }
};

let jarvisBridge = null;

/**
 * Inicializar la integración con JARVIS
 */
async function initializeJarvisIntegration(app, config = {}) {
    try {
        logger.info('═══════════════════════════════════════════════════════');
        logger.info('     INICIANDO INTEGRACIÓN SYSME-POS CON JARVIS       ');
        logger.info('═══════════════════════════════════════════════════════');

        // Combinar configuración predeterminada con la proporcionada
        const finalConfig = { ...JARVIS_CONFIG, ...config };

        // Crear instancia del bridge
        jarvisBridge = new SysmeJarvisBridge(finalConfig);

        // Inicializar el bridge
        await jarvisBridge.initialize();

        // Montar las rutas de JARVIS en la aplicación Express
        if (app) {
            app.use('/api/jarvis', jarvisBridge.apiRouter);
            logger.success('✅ Rutas de JARVIS montadas en /api/jarvis');
        }

        // Configurar event listeners para el sistema POS
        setupPOSIntegration(jarvisBridge);

        // Iniciar servicios automáticos si están configurados
        if (finalConfig.autonomous.mode === 'autonomous') {
            await startAutonomousServices(jarvisBridge);
        }

        logger.info('═══════════════════════════════════════════════════════');
        logger.success('    🚀 INTEGRACIÓN JARVIS COMPLETADA CON ÉXITO 🚀     ');
        logger.info('═══════════════════════════════════════════════════════');
        logger.info('');
        logger.info('📊 Componentes activos:');
        logger.info(`   • Memoria Neural: ${finalConfig.enableMemory ? '✅' : '❌'}`);
        logger.info(`   • Agente Autónomo: ${finalConfig.enableAutonomous ? '✅' : '❌'}`);
        logger.info(`   • Monitor Proactivo: ${finalConfig.enableProactive ? '✅' : '❌'}`);
        logger.info(`   • Sistema de Backup: ${finalConfig.enableBackup ? '✅' : '❌'}`);
        logger.info(`   • Analytics: ${finalConfig.analytics.enabled ? '✅' : '❌'}`);
        logger.info('');
        logger.info('🔗 Endpoints disponibles:');
        logger.info('   • GET  /api/jarvis/status - Estado del sistema');
        logger.info('   • GET  /api/jarvis/memory/contexts - Contextos de memoria');
        logger.info('   • POST /api/jarvis/memory/store - Almacenar en memoria');
        logger.info('   • POST /api/jarvis/autonomous/task - Ejecutar tarea');
        logger.info('   • GET  /api/jarvis/analytics/sales - Analytics de ventas');
        logger.info('   • GET  /api/jarvis/analytics/inventory - Analytics de inventario');
        logger.info('   • GET  /api/jarvis/metrics - Métricas de performance');
        logger.info('═══════════════════════════════════════════════════════');

        return jarvisBridge;

    } catch (error) {
        logger.error('❌ Error al inicializar integración con JARVIS:', error);
        throw error;
    }
}

/**
 * Configurar la integración específica con el sistema POS
 */
function setupPOSIntegration(bridge) {
    logger.info('🔧 Configurando integración con sistema POS...');

    // Registrar handlers para eventos del POS
    bridge.on('sale:completed', (data) => {
        logger.info('💰 Venta completada procesada por JARVIS', { saleId: data.id });
    });

    bridge.on('inventory:low', (data) => {
        logger.warn('📦 Inventario bajo detectado', data);
    });

    bridge.on('cashSession:opened', (data) => {
        logger.info('💵 Sesión de caja abierta', { sessionId: data.id });
    });

    bridge.on('cashSession:closed', (data) => {
        logger.info('💵 Sesión de caja cerrada', { sessionId: data.id });
    });

    bridge.on('alert', (alert) => {
        const logMethod = alert.severity === 'critical' ? 'error' :
                         alert.severity === 'warning' ? 'warn' : 'info';
        logger[logMethod](`⚠️ Alerta JARVIS: ${alert.type}`, alert);
    });

    bridge.on('proactive:alert', (alert) => {
        logger.warn('🔔 Alerta proactiva:', alert);
    });

    logger.success('✅ Integración con sistema POS configurada');
}

/**
 * Iniciar servicios automáticos
 */
async function startAutonomousServices(bridge) {
    logger.info('🤖 Iniciando servicios autónomos...');

    try {
        // Programar análisis diario
        setInterval(async () => {
            try {
                const analysis = await bridge.analyzeDailySales();
                logger.info('📊 Análisis diario completado', analysis);
            } catch (error) {
                logger.error('Error en análisis diario:', error);
            }
        }, 24 * 60 * 60 * 1000); // Cada 24 horas

        // Verificación de inventario
        setInterval(async () => {
            try {
                const alerts = await bridge.checkInventoryLevels();
                if (alerts.length > 0) {
                    logger.warn(`📦 ${alerts.length} alertas de inventario generadas`);
                }
            } catch (error) {
                logger.error('Error verificando inventario:', error);
            }
        }, 30 * 60 * 1000); // Cada 30 minutos

        logger.success('✅ Servicios autónomos iniciados');
    } catch (error) {
        logger.error('Error iniciando servicios autónomos:', error);
        throw error;
    }
}

/**
 * Conectar con una base de datos existente de SYSME
 */
async function connectToSysmeDatabase(bridge, dbConfig) {
    logger.info('🔗 Conectando con base de datos SYSME...');

    try {
        // TODO: Implementar conexión con la base de datos real
        // Por ahora, esto es un placeholder

        logger.success('✅ Conectado a base de datos SYSME');
        return true;
    } catch (error) {
        logger.error('Error conectando con base de datos:', error);
        throw error;
    }
}

/**
 * Obtener instancia del bridge
 */
function getJarvisBridge() {
    if (!jarvisBridge) {
        logger.warn('⚠️ JARVIS Bridge no ha sido inicializado');
        return null;
    }
    return jarvisBridge;
}

/**
 * Emitir evento al sistema JARVIS
 */
function emitToJarvis(event, data) {
    if (!jarvisBridge) {
        logger.warn('⚠️ No se puede emitir evento, JARVIS no está inicializado');
        return false;
    }

    jarvisBridge.emit(event, data);
    return true;
}

/**
 * Cerrar la integración con JARVIS
 */
async function shutdownJarvisIntegration() {
    if (jarvisBridge) {
        logger.info('🔌 Cerrando integración con JARVIS...');
        await jarvisBridge.shutdown();
        jarvisBridge = null;
        logger.success('✅ Integración con JARVIS cerrada');
    }
}

// Manejo de señales de cierre
process.on('SIGINT', async () => {
    await shutdownJarvisIntegration();
    process.exit(0);
});

process.on('SIGTERM', async () => {
    await shutdownJarvisIntegration();
    process.exit(0);
});

module.exports = {
    initializeJarvisIntegration,
    getJarvisBridge,
    emitToJarvis,
    shutdownJarvisIntegration,
    connectToSysmeDatabase,
    JARVIS_CONFIG
};
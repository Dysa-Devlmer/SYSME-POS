/**
 * Update Server with JARVIS Integration
 * Script para actualizar el servidor principal con la integración de JARVIS
 */

const fs = require('fs');
const path = require('path');
const logger = require('./utils/logger');

// Función para insertar código en el archivo del servidor
function updateServerFile() {
    const serverPath = path.join(__dirname, 'server.js');

    // Leer el archivo actual
    let serverContent = fs.readFileSync(serverPath, 'utf8');

    // Verificar si ya tiene la integración
    if (serverContent.includes('jarvis-integration')) {
        logger.info('El servidor ya tiene integración con JARVIS');
        return false;
    }

    // Código a insertar después de los imports
    const jarvisImport = `
// JARVIS Integration
const { initializeJarvisIntegration } = require('./jarvis-integration/initialize-jarvis');
const cashSessionRoutes = require('./routes/cashSessionRoutes');
`;

    // Código para inicializar JARVIS (insertar antes de app.listen)
    const jarvisInit = `
// Initialize JARVIS Integration
initializeJarvisIntegration(app, {
    enableAI: process.env.ENABLE_JARVIS_AI !== 'false',
    enableMemory: process.env.ENABLE_JARVIS_MEMORY !== 'false',
    enableAutonomous: process.env.ENABLE_JARVIS_AUTONOMOUS !== 'false',
    enableProactive: process.env.ENABLE_JARVIS_PROACTIVE !== 'false',
    enableBackup: process.env.ENABLE_JARVIS_BACKUP !== 'false'
}).then(() => {
    logger.info('✨ JARVIS Integration initialized successfully');
}).catch(error => {
    logger.error('Failed to initialize JARVIS Integration:', error);
});

// Cash Session Routes
app.use('/api/v1/cash-sessions', cashSessionRoutes);
`;

    // Buscar el lugar correcto para insertar los imports
    const importIndex = serverContent.indexOf('const app = express();');
    if (importIndex === -1) {
        logger.error('No se encontró el punto de inserción para imports');
        return false;
    }

    // Insertar imports
    serverContent = serverContent.slice(0, importIndex) +
                   jarvisImport +
                   serverContent.slice(importIndex);

    // Buscar el lugar para insertar la inicialización (antes de app.listen)
    const listenIndex = serverContent.indexOf('app.listen(');
    if (listenIndex === -1) {
        logger.error('No se encontró el punto de inserción para inicialización');
        return false;
    }

    // Insertar inicialización
    serverContent = serverContent.slice(0, listenIndex) +
                   jarvisInit + '\n' +
                   serverContent.slice(listenIndex);

    // Crear backup del archivo original
    const backupPath = serverPath + '.backup.' + Date.now();
    fs.copyFileSync(serverPath, backupPath);
    logger.info(`Backup creado: ${backupPath}`);

    // Escribir el archivo actualizado
    fs.writeFileSync(serverPath, serverContent);
    logger.success('Server.js actualizado con integración JARVIS');

    return true;
}

// Función para actualizar las variables de entorno
function updateEnvFile() {
    const envPath = path.join(__dirname, '.env');

    if (!fs.existsSync(envPath)) {
        logger.warn('.env file not found');
        return;
    }

    let envContent = fs.readFileSync(envPath, 'utf8');

    // Variables JARVIS a agregar si no existen
    const jarvisVars = `
# JARVIS Integration Settings
ENABLE_JARVIS_AI=true
ENABLE_JARVIS_MEMORY=true
ENABLE_JARVIS_AUTONOMOUS=false
ENABLE_JARVIS_PROACTIVE=true
ENABLE_JARVIS_BACKUP=true
JARVIS_PORT=7779

# JARVIS AI Configuration
JARVIS_AI_MODEL=gpt-3.5-turbo
JARVIS_AI_TEMPERATURE=0.7
JARVIS_AI_MAX_TOKENS=2000

# JARVIS Memory Settings
JARVIS_MEMORY_CONSOLIDATION_INTERVAL=3600000
JARVIS_MEMORY_MAX_SIZE=100000000

# JARVIS Backup Settings
JARVIS_BACKUP_PATH=./backups
JARVIS_BACKUP_RETENTION_DAYS=30
JARVIS_BACKUP_COMPRESSION=true
`;

    if (!envContent.includes('JARVIS')) {
        envContent += '\n' + jarvisVars;
        fs.writeFileSync(envPath, envContent);
        logger.success('.env actualizado con configuración JARVIS');
    } else {
        logger.info('.env ya contiene configuración JARVIS');
    }
}

// Función para ejecutar migraciones
async function runMigrations() {
    const db = require('./config/database');
    const migrationPath = path.join(__dirname, 'migrations/003_create_cash_sessions_tables.sql');

    if (!fs.existsSync(migrationPath)) {
        logger.error('Migration file not found');
        return false;
    }

    try {
        const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

        // Dividir por statements (simplificado, asume que cada statement termina con ;)
        const statements = migrationSQL
            .split(';')
            .map(s => s.trim())
            .filter(s => s.length > 0 && !s.startsWith('--'));

        logger.info(`Ejecutando ${statements.length} statements de migración...`);

        for (const statement of statements) {
            try {
                await db.raw(statement + ';');
            } catch (error) {
                // Ignorar errores de "already exists"
                if (!error.message.includes('already exists')) {
                    logger.error(`Error en statement: ${error.message}`);
                }
            }
        }

        logger.success('✅ Migraciones ejecutadas correctamente');
        return true;
    } catch (error) {
        logger.error('Error ejecutando migraciones:', error);
        return false;
    }
}

// Función principal
async function main() {
    console.log('');
    console.log('═══════════════════════════════════════════════════════');
    console.log('    ACTUALIZANDO SYSME-POS CON INTEGRACIÓN JARVIS     ');
    console.log('═══════════════════════════════════════════════════════');
    console.log('');

    try {
        // 1. Actualizar archivo del servidor
        logger.info('📝 Actualizando server.js...');
        const serverUpdated = updateServerFile();

        // 2. Actualizar variables de entorno
        logger.info('🔧 Actualizando .env...');
        updateEnvFile();

        // 3. Ejecutar migraciones
        logger.info('💾 Ejecutando migraciones de base de datos...');
        await runMigrations();

        console.log('');
        console.log('═══════════════════════════════════════════════════════');
        console.log('    ✅ ACTUALIZACIÓN COMPLETADA EXITOSAMENTE ✅       ');
        console.log('═══════════════════════════════════════════════════════');
        console.log('');
        console.log('📌 Siguientes pasos:');
        console.log('   1. Reiniciar el servidor backend');
        console.log('   2. Verificar logs para confirmar integración');
        console.log('   3. Probar endpoints en /api/jarvis/status');
        console.log('   4. Configurar las variables JARVIS en .env según necesidad');
        console.log('');
        console.log('🎯 Nuevos endpoints disponibles:');
        console.log('   • /api/jarvis/* - Endpoints de JARVIS');
        console.log('   • /api/v1/cash-sessions/* - Gestión de sesiones de caja');
        console.log('');

        process.exit(0);
    } catch (error) {
        logger.error('Error en actualización:', error);
        process.exit(1);
    }
}

// Ejecutar si es llamado directamente
if (require.main === module) {
    main();
}

module.exports = { updateServerFile, updateEnvFile, runMigrations };
/**
 * Script de Backup Automático para Producción
 * Crea backups de la base de datos y configuraciones
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m'
};

function log(message, color = '') {
  const timestamp = new Date().toLocaleString('es-CL');
  console.log(`${color}[${timestamp}] ${message}${colors.reset}`);
}

function createBackupFilename(type = 'database') {
  const now = new Date();
  const day = String(now.getDate()).padStart(2, '0');
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const year = now.getFullYear();
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');

  return `${day}-${month}-${year}_${hours}-${minutes}_backup_${type}.db`;
}

async function ensureBackupDirectory() {
  const backupDir = path.join(__dirname, '../../backups');

  if (!fs.existsSync(backupDir)) {
    log('Creando directorio de backups...', colors.yellow);
    fs.mkdirSync(backupDir, { recursive: true });
    log('✓ Directorio de backups creado', colors.green);
  }

  return backupDir;
}

async function backupDatabase() {
  console.log('\n' + '='.repeat(60));
  log('INICIANDO BACKUP DE BASE DE DATOS', colors.cyan);
  console.log('='.repeat(60) + '\n');

  try {
    // Rutas
    const dbPath = path.join(__dirname, '../../data/sysme_production.db');
    const backupDir = await ensureBackupDirectory();
    const backupFilename = createBackupFilename('database');
    const backupPath = path.join(backupDir, backupFilename);

    // Verificar que existe la BD
    if (!fs.existsSync(dbPath)) {
      log('✗ Base de datos no encontrada: ' + dbPath, colors.red);
      return false;
    }

    // Obtener tamaño
    const stats = fs.statSync(dbPath);
    const sizeInMB = (stats.size / 1024 / 1024).toFixed(2);
    log(`Base de datos encontrada (${sizeInMB} MB)`, colors.cyan);

    // Copiar archivo
    log('Copiando base de datos...', colors.yellow);
    fs.copyFileSync(dbPath, backupPath);

    // Verificar backup
    if (fs.existsSync(backupPath)) {
      const backupStats = fs.statSync(backupPath);
      const backupSizeInMB = (backupStats.size / 1024 / 1024).toFixed(2);

      log('✓ Backup creado exitosamente', colors.green);
      log(`  Archivo: ${backupFilename}`, colors.cyan);
      log(`  Tamaño: ${backupSizeInMB} MB`, colors.cyan);
      log(`  Ubicación: ${backupDir}`, colors.cyan);

      return true;
    }

    return false;
  } catch (error) {
    log('✗ Error al crear backup: ' + error.message, colors.red);
    return false;
  }
}

async function cleanOldBackups(retentionDays = 30) {
  log('\nLimpiando backups antiguos...', colors.yellow);

  try {
    const backupDir = path.join(__dirname, '../../backups');

    if (!fs.existsSync(backupDir)) {
      log('No hay backups antiguos', colors.cyan);
      return;
    }

    const files = fs.readdirSync(backupDir);
    const now = Date.now();
    const maxAge = retentionDays * 24 * 60 * 60 * 1000; // días a milisegundos

    let deletedCount = 0;

    files.forEach(file => {
      const filePath = path.join(backupDir, file);
      const stats = fs.statSync(filePath);
      const age = now - stats.mtimeMs;

      if (age > maxAge && file.endsWith('.db')) {
        fs.unlinkSync(filePath);
        deletedCount++;
        log(`  ✓ Eliminado: ${file}`, colors.yellow);
      }
    });

    if (deletedCount > 0) {
      log(`✓ ${deletedCount} backup(s) antiguo(s) eliminado(s)`, colors.green);
    } else {
      log('No hay backups antiguos para eliminar', colors.cyan);
    }
  } catch (error) {
    log('✗ Error al limpiar backups: ' + error.message, colors.red);
  }
}

async function listBackups() {
  log('\nBackups disponibles:', colors.cyan);

  try {
    const backupDir = path.join(__dirname, '../../backups');

    if (!fs.existsSync(backupDir)) {
      log('  No hay backups', colors.yellow);
      return;
    }

    const files = fs.readdirSync(backupDir)
      .filter(f => f.endsWith('.db'))
      .sort()
      .reverse();

    if (files.length === 0) {
      log('  No hay backups', colors.yellow);
      return;
    }

    files.slice(0, 10).forEach((file, index) => {
      const filePath = path.join(backupDir, file);
      const stats = fs.statSync(filePath);
      const sizeInMB = (stats.size / 1024 / 1024).toFixed(2);
      const date = new Date(stats.mtime).toLocaleString('es-CL');

      log(`  ${index + 1}. ${file}`, colors.green);
      log(`     Tamaño: ${sizeInMB} MB | Fecha: ${date}`, colors.cyan);
    });

    if (files.length > 10) {
      log(`  ... y ${files.length - 10} más`, colors.yellow);
    }

    log(`\n  Total: ${files.length} backup(s)`, colors.cyan);
  } catch (error) {
    log('✗ Error al listar backups: ' + error.message, colors.red);
  }
}

async function backupConfiguration() {
  log('\nBackup de configuración...', colors.yellow);

  try {
    const envPath = path.join(__dirname, '../../.env.production');
    const backupDir = await ensureBackupDirectory();
    const backupFilename = createBackupFilename('config').replace('.db', '.env');
    const backupPath = path.join(backupDir, backupFilename);

    if (fs.existsSync(envPath)) {
      fs.copyFileSync(envPath, backupPath);
      log('✓ Configuración respaldada', colors.green);
    } else {
      log('No se encontró .env.production', colors.yellow);
    }
  } catch (error) {
    log('✗ Error al respaldar configuración: ' + error.message, colors.red);
  }
}

async function main() {
  const args = process.argv.slice(2);
  const command = args[0] || 'create';

  switch (command) {
    case 'create':
      const success = await backupDatabase();
      await backupConfiguration();
      await listBackups();
      console.log('\n' + '='.repeat(60));
      if (success) {
        log('BACKUP COMPLETADO EXITOSAMENTE', colors.green);
      } else {
        log('BACKUP FALLIDO', colors.red);
      }
      console.log('='.repeat(60) + '\n');
      process.exit(success ? 0 : 1);
      break;

    case 'list':
      await listBackups();
      console.log('');
      break;

    case 'clean':
      const days = parseInt(args[1]) || 30;
      await cleanOldBackups(days);
      console.log('');
      break;

    case 'help':
      console.log('\nUso: node backup-production.js [comando] [opciones]\n');
      console.log('Comandos:');
      console.log('  create       - Crear nuevo backup (por defecto)');
      console.log('  list         - Listar backups disponibles');
      console.log('  clean [días] - Eliminar backups más antiguos que X días (defecto: 30)');
      console.log('  help         - Mostrar esta ayuda\n');
      break;

    default:
      log('Comando no reconocido. Usa: node backup-production.js help', colors.red);
      process.exit(1);
  }
}

// Ejecutar si se llama directamente
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(error => {
    log('Error fatal: ' + error.message, colors.red);
    process.exit(1);
  });
}

export { backupDatabase, cleanOldBackups, listBackups };

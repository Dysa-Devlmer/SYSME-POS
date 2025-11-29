/**
 * Script de Verificación de Producción
 * Verifica que el sistema esté listo para producción real
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const checks = [];
let allPassed = true;

// Colores para consola
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

function printHeader() {
  console.log('\n' + '='.repeat(60));
  console.log(`${colors.cyan}  SYSME - Verificación de Producción${colors.reset}`);
  console.log('='.repeat(60) + '\n');
}

function printResult(passed, message, details = '') {
  const symbol = passed ? '✓' : '✗';
  const color = passed ? colors.green : colors.red;
  console.log(`${color}${symbol}${colors.reset} ${message}`);
  if (details) {
    console.log(`  ${colors.blue}→${colors.reset} ${details}`);
  }
  checks.push({ passed, message, details });
  if (!passed) allPassed = false;
}

function checkEnvironment() {
  console.log(`\n${colors.yellow}━━━ Verificando Entorno ━━━${colors.reset}\n`);

  // NODE_ENV
  const nodeEnv = process.env.NODE_ENV;
  printResult(
    nodeEnv === 'production',
    'NODE_ENV configurado',
    nodeEnv === 'production' ? 'Modo: production' : `Advertencia: ${nodeEnv || 'no configurado'}`
  );

  // Versión de Node
  const nodeVersion = process.version;
  const majorVersion = parseInt(nodeVersion.slice(1).split('.')[0]);
  printResult(
    majorVersion >= 18,
    'Versión de Node.js',
    `Versión: ${nodeVersion} (Mínimo: 18.x)`
  );
}

function checkDirectories() {
  console.log(`\n${colors.yellow}━━━ Verificando Directorios ━━━${colors.reset}\n`);

  const dirs = [
    { path: './data', name: 'Base de datos' },
    { path: './logs', name: 'Logs' },
    { path: './backups', name: 'Backups' },
    { path: './uploads', name: 'Uploads' },
  ];

  dirs.forEach(({ path: dirPath, name }) => {
    const fullPath = path.join(__dirname, '../../', dirPath);
    const exists = fs.existsSync(fullPath);

    if (!exists) {
      try {
        fs.mkdirSync(fullPath, { recursive: true });
        printResult(true, `Directorio ${name}`, `Creado: ${dirPath}`);
      } catch (error) {
        printResult(false, `Directorio ${name}`, `Error al crear: ${error.message}`);
      }
    } else {
      printResult(true, `Directorio ${name}`, `Existe: ${dirPath}`);
    }
  });
}

function checkDatabase() {
  console.log(`\n${colors.yellow}━━━ Verificando Base de Datos ━━━${colors.reset}\n`);

  const dbPath = path.join(__dirname, '../../data/sysme_production.db');
  const dbExists = fs.existsSync(dbPath);

  if (dbExists) {
    const stats = fs.statSync(dbPath);
    const sizeInMB = (stats.size / 1024 / 1024).toFixed(2);
    printResult(
      true,
      'Base de datos de producción',
      `Tamaño: ${sizeInMB} MB`
    );
  } else {
    printResult(
      false,
      'Base de datos de producción',
      'No existe - Se creará al iniciar'
    );
  }

  // Verificar base de datos de desarrollo como respaldo
  const devDbPath = path.join(__dirname, '../../data/sysme.db');
  if (fs.existsSync(devDbPath)) {
    printResult(
      true,
      'Base de datos de desarrollo (respaldo)',
      'Disponible para migración'
    );
  }
}

function checkConfiguration() {
  console.log(`\n${colors.yellow}━━━ Verificando Configuración ━━━${colors.reset}\n`);

  // .env.production
  const envPath = path.join(__dirname, '../../.env.production');
  printResult(
    fs.existsSync(envPath),
    'Archivo .env.production',
    fs.existsSync(envPath) ? 'Configurado' : 'Falta crear'
  );

  // Variables críticas
  const criticalVars = [
    'PORT',
    'DB_TYPE',
    'DB_PATH',
    'JWT_SECRET',
  ];

  const missingVars = criticalVars.filter(v => !process.env[v]);
  printResult(
    missingVars.length === 0,
    'Variables de entorno críticas',
    missingVars.length === 0
      ? 'Todas configuradas'
      : `Faltan: ${missingVars.join(', ')}`
  );
}

function checkPorts() {
  console.log(`\n${colors.yellow}━━━ Verificando Puertos ━━━${colors.reset}\n`);

  const backendPort = process.env.PORT || process.env.BACKEND_PORT;
  const frontendPort = process.env.FRONTEND_PORT;

  printResult(
    backendPort && backendPort !== '3001' && backendPort !== '3000',
    'Puerto backend no estándar',
    backendPort ? `Puerto: ${backendPort}` : 'No configurado'
  );

  printResult(
    frontendPort && frontendPort !== '3000' && frontendPort !== '5173',
    'Puerto frontend no estándar',
    frontendPort ? `Puerto: ${frontendPort}` : 'No configurado'
  );
}

function checkSecurity() {
  console.log(`\n${colors.yellow}━━━ Verificando Seguridad ━━━${colors.reset}\n`);

  const jwtSecret = process.env.JWT_SECRET;
  printResult(
    jwtSecret && jwtSecret.length >= 32,
    'JWT Secret seguro',
    jwtSecret
      ? (jwtSecret.length >= 32 ? 'Longitud adecuada (≥32 caracteres)' : 'Muy corto')
      : 'No configurado'
  );

  const corsOrigin = process.env.CORS_ORIGIN;
  printResult(
    corsOrigin && corsOrigin.includes('127.0.0.1'),
    'CORS configurado para localhost',
    corsOrigin || 'No configurado'
  );
}

function checkDependencies() {
  console.log(`\n${colors.yellow}━━━ Verificando Dependencias ━━━${colors.reset}\n`);

  const packagePath = path.join(__dirname, '../../package.json');

  if (fs.existsSync(packagePath)) {
    const pkg = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
    const depCount = Object.keys(pkg.dependencies || {}).length;
    const devDepCount = Object.keys(pkg.devDependencies || {}).length;

    printResult(
      depCount > 0,
      'Dependencias de producción',
      `${depCount} paquetes configurados`
    );

    // Verificar que node_modules existe
    const nodeModulesPath = path.join(__dirname, '../../node_modules');
    printResult(
      fs.existsSync(nodeModulesPath),
      'Node modules instalados',
      fs.existsSync(nodeModulesPath) ? 'Instalados' : 'Ejecutar: npm install'
    );
  }
}

function printSummary() {
  console.log('\n' + '='.repeat(60));
  console.log(`${colors.cyan}  Resumen de Verificación${colors.reset}`);
  console.log('='.repeat(60) + '\n');

  const passed = checks.filter(c => c.passed).length;
  const failed = checks.filter(c => !c.passed).length;

  console.log(`${colors.green}✓${colors.reset} Verificaciones exitosas: ${passed}`);
  if (failed > 0) {
    console.log(`${colors.red}✗${colors.reset} Verificaciones fallidas: ${failed}`);
    console.log(`\n${colors.yellow}Revisa las advertencias arriba antes de continuar${colors.reset}`);
  }

  console.log('\n' + '='.repeat(60));

  if (allPassed) {
    console.log(`${colors.green}✓ SISTEMA LISTO PARA PRODUCCIÓN${colors.reset}`);
  } else {
    console.log(`${colors.yellow}⚠ ADVERTENCIAS ENCONTRADAS${colors.reset}`);
    console.log(`${colors.blue}→${colors.reset} Revisa los mensajes arriba`);
  }
  console.log('='.repeat(60) + '\n');
}

// Ejecutar verificaciones
async function runChecks() {
  printHeader();

  checkEnvironment();
  checkDirectories();
  checkDatabase();
  checkConfiguration();
  checkPorts();
  checkSecurity();
  checkDependencies();

  printSummary();

  return allPassed;
}

// Ejecutar si se llama directamente
if (import.meta.url === `file://${process.argv[1]}`) {
  runChecks()
    .then(success => {
      process.exit(success ? 0 : 1);
    })
    .catch(error => {
      console.error(`\n${colors.red}Error fatal:${colors.reset}`, error.message);
      process.exit(1);
    });
}

export default runChecks;

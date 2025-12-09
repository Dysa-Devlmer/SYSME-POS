#!/usr/bin/env node
/**
 * Panel Web Protegido - Con auto-restart y gestión de memoria
 */

import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const CONFIG = {
  maxRestarts: 10,
  restartDelay: 3000,
  resetCounterAfter: 300000,
  logFile: join(__dirname, 'logs', 'panel-watchdog.log'),
  backendScript: join(__dirname, 'backend', 'server.cjs')
};

let restartCount = 0;
let lastRestart = 0;
let isShuttingDown = false;
let backendProcess = null;
let frontendProcess = null;

// Asegurar logs
const logDir = dirname(CONFIG.logFile);
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir, { recursive: true });
}

function log(message, level = 'INFO') {
  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] [${level}] ${message}\n`;
  const emoji = level === 'ERROR' ? '❌' : level === 'WARN' ? '⚠️' : '✅';
  console.log(`${emoji} ${message}`);

  try {
    fs.appendFileSync(CONFIG.logFile, logMessage);
  } catch (error) {
    console.error('Error escribiendo log:', error.message);
  }
}

function startBackend() {
  if (isShuttingDown) return;

  log('Iniciando backend en puerto 7777...', 'INFO');

  backendProcess = spawn('node', ['--expose-gc', CONFIG.backendScript], {
    stdio: 'inherit',
    shell: true,
    cwd: join(__dirname, 'backend'),
    env: {
      ...process.env,
      PORT: '7777',
      NODE_ENV: 'production'
    }
  });

  log(`Backend iniciado con PID: ${backendProcess.pid}`, 'INFO');

  backendProcess.on('exit', (code, signal) => {
    if (isShuttingDown) return;

    if (code !== 0) {
      const now = Date.now();
      if (now - lastRestart > CONFIG.resetCounterAfter) {
        restartCount = 0;
      }

      if (restartCount < CONFIG.maxRestarts) {
        restartCount++;
        lastRestart = now;
        log(`Backend cerrado (código ${code}), reiniciando en ${CONFIG.restartDelay}ms...`, 'WARN');
        setTimeout(() => startBackend(), CONFIG.restartDelay);
      } else {
        log('Máximo de reinicios alcanzado para backend', 'ERROR');
      }
    }
  });

  // Esperar 2 segundos y luego iniciar frontend
  setTimeout(() => startFrontend(), 2000);
}

function startFrontend() {
  if (isShuttingDown || frontendProcess) return;

  log('Iniciando frontend React...', 'INFO');

  frontendProcess = spawn('npm', ['run', 'dev'], {
    stdio: 'inherit',
    shell: true,
    cwd: join(__dirname, 'frontend')
  });

  log(`Frontend iniciado con PID: ${frontendProcess.pid}`, 'INFO');

  frontendProcess.on('exit', (code) => {
    if (isShuttingDown) return;
    log(`Frontend cerrado (código ${code})`, code === 0 ? 'INFO' : 'WARN');
    frontendProcess = null;
  });
}

process.on('SIGINT', () => {
  if (isShuttingDown) return;
  isShuttingDown = true;

  log('Deteniendo panel web...', 'WARN');

  if (backendProcess && !backendProcess.killed) {
    backendProcess.kill('SIGTERM');
  }

  if (frontendProcess && !frontendProcess.killed) {
    frontendProcess.kill('SIGTERM');
  }

  setTimeout(() => process.exit(0), 3000);
});

console.log(`
╔═══════════════════════════════════════════════════════════╗
║                                                           ║
║    🛡️ PANEL WEB PROTEGIDO - Auto-Restart Activo        ║
║                                                           ║
║    Backend: http://localhost:7777                        ║
║    Frontend: http://localhost:5173                       ║
║                                                           ║
╚═══════════════════════════════════════════════════════════╝
`);

log('Panel Web Watchdog iniciado', 'INFO');
startBackend();

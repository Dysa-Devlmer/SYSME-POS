#!/usr/bin/env node
/**
 * PROCESS GUARDIAN - Sistema de Protección de Procesos
 * Previene cierres inesperados de Node.js
 * Monitorea memoria, auto-restart, y gestión de recursos
 */

import { spawn } from 'child_process';
import os from 'os';
import fs from 'fs';
import path from 'path';

export default class ProcessGuardian {
  constructor(options = {}) {
    this.processName = options.processName || 'JARVIS';
    this.maxRestarts = options.maxRestarts || 5;
    this.restartDelay = options.restartDelay || 2000;
    this.memoryThreshold = options.memoryThreshold || 90; // %
    this.memoryCheckInterval = options.memoryCheckInterval || 10000; // 10s
    this.gcInterval = options.gcInterval || 30000; // 30s

    this.restartCount = 0;
    this.lastRestart = 0;
    this.isShuttingDown = false;
    this.childProcess = null;
    this.monitoringInterval = null;
    this.gcIntervalId = null;

    this.logFile = path.join(process.cwd(), 'logs', 'guardian.log');
    this.ensureLogDir();
  }

  ensureLogDir() {
    const logDir = path.dirname(this.logFile);
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true });
    }
  }

  log(message, level = 'INFO') {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] [${level}] ${message}\n`;

    console.log(`${level === 'ERROR' ? '❌' : level === 'WARN' ? '⚠️' : '✅'} ${message}`);

    try {
      fs.appendFileSync(this.logFile, logMessage);
    } catch (error) {
      console.error('No se pudo escribir en el log:', error.message);
    }
  }

  getSystemMemory() {
    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    const usedMem = totalMem - freeMem;
    const usagePercent = (usedMem / totalMem) * 100;

    return {
      total: Math.round(totalMem / 1024 / 1024), // MB
      free: Math.round(freeMem / 1024 / 1024),
      used: Math.round(usedMem / 1024 / 1024),
      usagePercent: Math.round(usagePercent * 100) / 100
    };
  }

  getProcessMemory() {
    const memUsage = process.memoryUsage();
    return {
      rss: Math.round(memUsage.rss / 1024 / 1024), // MB
      heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024),
      heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024),
      external: Math.round(memUsage.external / 1024 / 1024)
    };
  }

  forceGarbageCollection() {
    if (global.gc) {
      this.log('Ejecutando Garbage Collection manual...', 'INFO');
      global.gc();
      return true;
    } else {
      this.log('GC manual no disponible (ejecutar con --expose-gc)', 'WARN');
      return false;
    }
  }

  async clearMemoryCaches() {
    this.log('Limpiando caches de memoria...', 'INFO');

    // Forzar GC si está disponible
    this.forceGarbageCollection();

    // Dar tiempo al GC
    await new Promise(resolve => setTimeout(resolve, 1000));

    const memAfter = this.getSystemMemory();
    this.log(`Memoria después de limpiar: ${memAfter.usagePercent}%`, 'INFO');
  }

  startMemoryMonitoring() {
    this.log('Iniciando monitoreo de memoria...', 'INFO');

    // Monitoreo cada 10 segundos
    this.monitoringInterval = setInterval(() => {
      const sysMem = this.getSystemMemory();
      const procMem = this.getProcessMemory();

      if (sysMem.usagePercent >= this.memoryThreshold) {
        this.log(
          `⚠️ ALERTA DE MEMORIA ALTA: Sistema ${sysMem.usagePercent}% | Proceso ${procMem.heapUsed}MB`,
          'WARN'
        );

        // Intentar limpiar memoria
        this.clearMemoryCaches();
      }

      // Log cada minuto
      if (Date.now() % 60000 < this.memoryCheckInterval) {
        this.log(
          `Memoria: Sistema ${sysMem.usagePercent}% (${sysMem.used}MB/${sysMem.total}MB) | ` +
          `Proceso ${procMem.heapUsed}MB heap`,
          'INFO'
        );
      }
    }, this.memoryCheckInterval);

    // GC automático cada 30 segundos
    this.gcIntervalId = setInterval(() => {
      this.forceGarbageCollection();
    }, this.gcInterval);
  }

  stopMemoryMonitoring() {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }
    if (this.gcIntervalId) {
      clearInterval(this.gcIntervalId);
      this.gcIntervalId = null;
    }
  }

  setupProcessHandlers() {
    // Prevenir cierre por señales
    process.on('SIGINT', () => {
      if (this.isShuttingDown) return;
      this.isShuttingDown = true;
      this.log('Recibido SIGINT - Apagado controlado', 'WARN');
      this.gracefulShutdown();
    });

    process.on('SIGTERM', () => {
      if (this.isShuttingDown) return;
      this.isShuttingDown = true;
      this.log('Recibido SIGTERM - Apagado controlado', 'WARN');
      this.gracefulShutdown();
    });

    // Capturar errores no manejados
    process.on('uncaughtException', (error) => {
      this.log(`ERROR NO CAPTURADO: ${error.message}`, 'ERROR');
      this.log(`Stack: ${error.stack}`, 'ERROR');

      // No salir, solo logear
      this.log('Proceso continúa a pesar del error', 'WARN');
    });

    process.on('unhandledRejection', (reason, promise) => {
      this.log(`PROMESA RECHAZADA NO MANEJADA: ${reason}`, 'ERROR');
      this.log('Proceso continúa a pesar de la promesa rechazada', 'WARN');
    });

    // Advertencia de memoria
    process.on('warning', (warning) => {
      this.log(`NODE WARNING: ${warning.name} - ${warning.message}`, 'WARN');
    });
  }

  async gracefulShutdown() {
    this.log('Iniciando apagado controlado...', 'INFO');

    // Detener monitoreo
    this.stopMemoryMonitoring();

    // Limpiar memoria
    await this.clearMemoryCaches();

    this.log('Apagado completado', 'INFO');
    process.exit(0);
  }

  getStatus() {
    const sysMem = this.getSystemMemory();
    const procMem = this.getProcessMemory();

    return {
      processName: this.processName,
      uptime: Math.round(process.uptime()),
      restartCount: this.restartCount,
      monitoring: this.monitoringInterval !== null,
      memory: {
        system: sysMem,
        process: procMem
      },
      health: sysMem.usagePercent < this.memoryThreshold ? 'healthy' : 'warning'
    };
  }

  initialize() {
    this.log(`Iniciando Process Guardian para ${this.processName}`, 'INFO');
    this.log(`Umbral de memoria: ${this.memoryThreshold}%`, 'INFO');

    this.setupProcessHandlers();
    this.startMemoryMonitoring();

    const status = this.getStatus();
    this.log(
      `Sistema inicializado - Memoria: ${status.memory.system.usagePercent}%`,
      'INFO'
    );

    return status;
  }

  /**
   * Watchdog para otro proceso
   */
  watchProcess(command, args = [], options = {}) {
    this.log(`Iniciando watchdog para: ${command} ${args.join(' ')}`, 'INFO');

    const startProcess = () => {
      if (this.isShuttingDown) return;

      this.childProcess = spawn(command, args, {
        stdio: 'inherit',
        shell: true,
        ...options
      });

      this.log(`Proceso hijo iniciado con PID: ${this.childProcess.pid}`, 'INFO');

      this.childProcess.on('error', (error) => {
        this.log(`Error en proceso hijo: ${error.message}`, 'ERROR');
      });

      this.childProcess.on('exit', (code, signal) => {
        if (this.isShuttingDown) {
          this.log('Proceso hijo terminado durante shutdown', 'INFO');
          return;
        }

        this.log(
          `Proceso hijo terminó - Código: ${code} | Señal: ${signal}`,
          code === 0 ? 'INFO' : 'ERROR'
        );

        // Auto-restart si es necesario
        if (code !== 0 && this.restartCount < this.maxRestarts) {
          const now = Date.now();
          const timeSinceLastRestart = now - this.lastRestart;

          // Reset contador si pasó más de 5 minutos
          if (timeSinceLastRestart > 300000) {
            this.restartCount = 0;
          }

          this.restartCount++;
          this.lastRestart = now;

          this.log(
            `Reiniciando proceso en ${this.restartDelay}ms (intento ${this.restartCount}/${this.maxRestarts})...`,
            'WARN'
          );

          setTimeout(() => startProcess(), this.restartDelay);
        } else if (this.restartCount >= this.maxRestarts) {
          this.log(
            `Máximo de reinicios alcanzado (${this.maxRestarts}). Deteniendo watchdog.`,
            'ERROR'
          );
        }
      });
    };

    startProcess();

    // Manejar SIGINT para detener el proceso hijo
    process.on('SIGINT', () => {
      if (this.childProcess && !this.childProcess.killed) {
        this.log('Deteniendo proceso hijo...', 'WARN');
        this.childProcess.kill('SIGTERM');
        setTimeout(() => {
          if (!this.childProcess.killed) {
            this.childProcess.kill('SIGKILL');
          }
        }, 5000);
      }
    });
  }
}

// Uso standalone
if (import.meta.url === `file://${process.argv[1]}`) {
  const guardian = new ProcessGuardian({ processName: 'JARVIS-Guardian' });
  guardian.initialize();

  console.log('\n🛡️ Process Guardian - Modo Standalone');
  console.log('Presiona Ctrl+C para salir\n');
}

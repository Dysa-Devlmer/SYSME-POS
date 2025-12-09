// ============================================
// UNIVERSAL EXECUTOR - J.A.R.V.I.S. PURO
// ============================================
// Ejecutor universal de comandos - El verdadero poder omnipotente
//
// Características:
// ✅ Parse natural language → shell commands
// ✅ Safety validation (detecta comandos peligrosos)
// ✅ Execute with monitoring & retry
// ✅ Infer command sequences
// ✅ Cross-platform support (Windows, Linux, macOS)
// ✅ Output streaming en tiempo real
//
// Autor: Antropic Claude Sonnet 4.5
// Fecha: 2025-01-XX

import { exec, spawn } from 'child_process';
import { promisify } from 'util';
import fs from 'fs';
import path from 'path';
import os from 'os';

const execAsync = promisify(exec);

class UniversalExecutor {
  constructor() {
    this.platform = os.platform();
    this.isWindows = this.platform === 'win32';

    // Configuración
    this.config = {
      maxRetries: 3,
      timeout: 300000, // 5 min
      allowDangerousCommands: false,
      requireConfirmation: true,
      streamOutput: true,
    };

    // Comandos peligrosos que requieren confirmación explícita
    this.dangerousPatterns = [
      /rm\s+-rf\s+\//,           // rm -rf /
      /del\s+\/[SF]\s+[A-Z]:\\/,  // del /S /F C:\
      /format\s+[A-Z]:/i,         // format C:
      /dd\s+if=/,                 // dd if=/dev/zero
      /:\(\)\{\s*:\|:&\s*\};:/,   // fork bomb
      /sudo\s+.*passwd/,          // cambiar contraseñas
      /DROP\s+DATABASE/i,         // drop database
      /TRUNCATE\s+TABLE/i,        // truncate table
      /shutdown/i,                // shutdown system
      /reboot/i,                  // reboot system
    ];

    // Mapeo de comandos naturales → shell commands
    this.commandMappings = this.initializeCommandMappings();

    // Historial de ejecución
    this.executionHistory = [];
  }

  // ============================================
  // PARSE NATURAL LANGUAGE → SHELL COMMANDS
  // ============================================

  /**
   * Convierte lenguaje natural a comandos shell
   */
  async parseNaturalCommand(userMessage) {
    const lower = userMessage.toLowerCase().trim();

    // 1. Búsqueda directa en mappings
    for (const [pattern, commandGenerator] of this.commandMappings.entries()) {
      const match = lower.match(pattern);
      if (match) {
        const command = typeof commandGenerator === 'function'
          ? commandGenerator(match)
          : commandGenerator;

        return {
          command,
          confidence: 0.9,
          source: 'mapping',
          original: userMessage,
        };
      }
    }

    // 2. Detección de comandos explícitos
    const explicitCommand = this.detectExplicitCommand(lower);
    if (explicitCommand) {
      return {
        command: explicitCommand,
        confidence: 0.95,
        source: 'explicit',
        original: userMessage,
      };
    }

    // 3. Inferencia inteligente
    const inferredCommand = await this.inferCommand(lower);
    if (inferredCommand) {
      return {
        command: inferredCommand,
        confidence: 0.7,
        source: 'inferred',
        original: userMessage,
      };
    }

    return null;
  }

  /**
   * Inicializa mapeo de comandos naturales
   */
  initializeCommandMappings() {
    const mappings = new Map();

    // NPM Commands
    mappings.set(/^instala?\s+(.+)$/i, (match) => `npm install ${match[1]}`);
    mappings.set(/^desinstala?\s+(.+)$/i, (match) => `npm uninstall ${match[1]}`);
    mappings.set(/^actualiza?\s+dependencias$/i, 'npm update');
    mappings.set(/^ejecuta?\s+tests?$/i, 'npm test');
    mappings.set(/^ejecuta?\s+build$/i, 'npm run build');
    mappings.set(/^ejecuta?\s+dev$/i, 'npm run dev');

    // Git Commands
    mappings.set(/^git\s+status$/i, 'git status');
    mappings.set(/^git\s+log$/i, 'git log --oneline -10');
    mappings.set(/^git\s+diff$/i, 'git diff');
    mappings.set(/^git\s+branches$/i, 'git branch -a');

    // File Operations
    mappings.set(/^lista?\s+archivos?$/i, this.isWindows ? 'dir' : 'ls -la');
    mappings.set(/^muestra?\s+archivo\s+(.+)$/i, (match) =>
      this.isWindows ? `type "${match[1]}"` : `cat "${match[1]}"`
    );
    mappings.set(/^crea?\s+directorio\s+(.+)$/i, (match) =>
      this.isWindows ? `mkdir "${match[1]}"` : `mkdir -p "${match[1]}"`
    );
    mappings.set(/^elimina?\s+archivo\s+(.+)$/i, (match) =>
      this.isWindows ? `del "${match[1]}"` : `rm "${match[1]}"`
    );

    // System Info
    mappings.set(/^info(rmación)?\s+sistema$/i, this.isWindows ? 'systeminfo' : 'uname -a');
    mappings.set(/^procesos$/i, this.isWindows ? 'tasklist' : 'ps aux');
    mappings.set(/^uso\s+disco$/i, this.isWindows ? 'wmic logicaldisk get size,freespace,caption' : 'df -h');
    mappings.set(/^uso\s+memoria$/i, this.isWindows ? 'systeminfo | findstr Memory' : 'free -h');

    // Network
    mappings.set(/^ping\s+(.+)$/i, (match) => `ping ${match[1]}`);
    mappings.set(/^ip\s+address$/i, this.isWindows ? 'ipconfig' : 'ip addr');

    // Docker (si aplica)
    mappings.set(/^docker\s+ps$/i, 'docker ps');
    mappings.set(/^docker\s+images$/i, 'docker images');
    mappings.set(/^docker\s+logs\s+(.+)$/i, (match) => `docker logs ${match[1]}`);

    return mappings;
  }

  /**
   * Detecta comandos explícitos (ejecuta X, corre Y, etc.)
   */
  detectExplicitCommand(message) {
    // Patrones: "ejecuta npm install", "corre git status", etc.
    const patterns = [
      /^ejecuta?\s+(.+)$/i,
      /^corre\s+(.+)$/i,
      /^run\s+(.+)$/i,
      /^execute\s+(.+)$/i,
    ];

    for (const pattern of patterns) {
      const match = message.match(pattern);
      if (match) {
        return match[1].trim();
      }
    }

    return null;
  }

  /**
   * Infiere comando desde contexto
   */
  async inferCommand(message) {
    // Detección de intenciones comunes
    const intentions = {
      'instalar': 'npm install',
      'install': 'npm install',
      'actualizar': 'npm update',
      'update': 'npm update',
      'build': 'npm run build',
      'compilar': 'npm run build',
      'test': 'npm test',
      'pruebas': 'npm test',
    };

    for (const [keyword, command] of Object.entries(intentions)) {
      if (message.includes(keyword)) {
        return command;
      }
    }

    return null;
  }

  // ============================================
  // SAFETY VALIDATION
  // ============================================

  /**
   * Valida si comando es seguro de ejecutar
   */
  validateSafety(command) {
    const result = {
      safe: true,
      dangerous: false,
      requiresConfirmation: false,
      reason: null,
      risk: 'low',
    };

    // Verificar patrones peligrosos
    for (const pattern of this.dangerousPatterns) {
      if (pattern.test(command)) {
        result.safe = false;
        result.dangerous = true;
        result.requiresConfirmation = true;
        result.reason = 'Comando potencialmente destructivo detectado';
        result.risk = 'critical';
        return result;
      }
    }

    // Comandos que modifican sistema
    const systemModifiers = [
      /sudo/i,
      /chmod\s+777/,
      /chown/,
      /systemctl/i,
      /service\s+/i,
    ];

    for (const pattern of systemModifiers) {
      if (pattern.test(command)) {
        result.requiresConfirmation = true;
        result.reason = 'Comando modifica configuración del sistema';
        result.risk = 'high';
        return result;
      }
    }

    // Comandos de eliminación
    if (/rm\s+-.*r|del\s+\/[SF]/i.test(command)) {
      result.requiresConfirmation = true;
      result.reason = 'Comando de eliminación recursiva';
      result.risk = 'medium';
      return result;
    }

    return result;
  }

  // ============================================
  // EXECUTION WITH MONITORING
  // ============================================

  /**
   * Ejecuta comando con monitoring, retry y safety checks
   */
  async executeWithMonitoring(command, options = {}) {
    const opts = {
      ...this.config,
      ...options,
    };

    // 1. Validar seguridad
    const safety = this.validateSafety(command);

    if (!safety.safe && !opts.allowDangerousCommands) {
      throw new Error(`Comando bloqueado por seguridad: ${safety.reason}`);
    }

    if (safety.requiresConfirmation && opts.requireConfirmation && !options.confirmed) {
      return {
        needsConfirmation: true,
        command,
        safety,
        message: `⚠️  Comando requiere confirmación:\n${command}\n\nRiesgo: ${safety.risk}\nRazón: ${safety.reason}`,
      };
    }

    // 2. Ejecutar con retry
    let lastError = null;
    let attempt = 0;

    while (attempt < opts.maxRetries) {
      attempt++;

      try {
        console.log(`[UniversalExecutor] Ejecutando (intento ${attempt}/${opts.maxRetries}): ${command}`);

        const result = opts.streamOutput
          ? await this.executeWithStreaming(command, opts)
          : await this.executeSimple(command, opts);

        // Guardar en historial
        this.executionHistory.push({
          command,
          timestamp: Date.now(),
          attempt,
          success: true,
          result,
        });

        return {
          success: true,
          command,
          stdout: result.stdout,
          stderr: result.stderr,
          exitCode: result.exitCode || 0,
          executionTime: result.executionTime,
        };

      } catch (error) {
        lastError = error;
        console.error(`[UniversalExecutor] Error en intento ${attempt}: ${error.message}`);

        if (attempt < opts.maxRetries) {
          console.log(`[UniversalExecutor] Reintentando en 2 segundos...`);
          await this.sleep(2000);
        }
      }
    }

    // Si llegamos aquí, todos los intentos fallaron
    this.executionHistory.push({
      command,
      timestamp: Date.now(),
      attempt,
      success: false,
      error: lastError.message,
    });

    throw new Error(`Comando falló después de ${opts.maxRetries} intentos: ${lastError.message}`);
  }

  /**
   * Ejecución simple sin streaming
   */
  async executeSimple(command, options) {
    const startTime = Date.now();

    const { stdout, stderr } = await execAsync(command, {
      timeout: options.timeout,
      cwd: options.cwd || process.cwd(),
      env: { ...process.env, ...options.env },
    });

    const executionTime = Date.now() - startTime;

    return {
      stdout: stdout.trim(),
      stderr: stderr.trim(),
      exitCode: 0,
      executionTime,
    };
  }

  /**
   * Ejecución con streaming de output
   */
  async executeWithStreaming(command, options) {
    return new Promise((resolve, reject) => {
      const startTime = Date.now();
      let stdout = '';
      let stderr = '';

      const [cmd, ...args] = command.split(' ');

      const child = spawn(cmd, args, {
        cwd: options.cwd || process.cwd(),
        env: { ...process.env, ...options.env },
        shell: true,
      });

      child.stdout.on('data', (data) => {
        const output = data.toString();
        stdout += output;
        console.log(`[UniversalExecutor] stdout: ${output.trim()}`);
      });

      child.stderr.on('data', (data) => {
        const output = data.toString();
        stderr += output;
        console.error(`[UniversalExecutor] stderr: ${output.trim()}`);
      });

      child.on('close', (code) => {
        const executionTime = Date.now() - startTime;

        if (code === 0) {
          resolve({
            stdout: stdout.trim(),
            stderr: stderr.trim(),
            exitCode: code,
            executionTime,
          });
        } else {
          reject(new Error(`Command failed with exit code ${code}\nstderr: ${stderr}`));
        }
      });

      child.on('error', (error) => {
        reject(error);
      });

      // Timeout
      setTimeout(() => {
        child.kill();
        reject(new Error('Command timeout'));
      }, options.timeout);
    });
  }

  // ============================================
  // COMMAND SEQUENCE INFERENCE
  // ============================================

  /**
   * Infiere secuencia de comandos necesarios
   */
  async inferCommandSequence(intent) {
    const sequences = {
      'deploy': [
        'npm run build',
        'git add .',
        'git commit -m "Deploy"',
        'git push',
      ],
      'setup': [
        'npm install',
        'npm run build',
        'npm test',
      ],
      'clean': [
        this.isWindows ? 'del /S /Q node_modules' : 'rm -rf node_modules',
        'npm cache clean --force',
        'npm install',
      ],
      'update': [
        'npm update',
        'npm audit fix',
        'npm test',
      ],
    };

    const lower = intent.toLowerCase();

    for (const [key, commands] of Object.entries(sequences)) {
      if (lower.includes(key)) {
        return {
          sequence: commands,
          name: key,
          description: `Secuencia de ${key}`,
        };
      }
    }

    return null;
  }

  /**
   * Ejecuta secuencia de comandos
   */
  async executeSequence(commands, options = {}) {
    const results = [];
    let allSuccess = true;

    for (let i = 0; i < commands.length; i++) {
      const command = commands[i];
      console.log(`\n[UniversalExecutor] Ejecutando paso ${i + 1}/${commands.length}: ${command}`);

      try {
        const result = await this.executeWithMonitoring(command, {
          ...options,
          requireConfirmation: false, // No pedir confirmación en cada paso
        });

        results.push({
          step: i + 1,
          command,
          ...result,
        });

      } catch (error) {
        console.error(`[UniversalExecutor] Secuencia falló en paso ${i + 1}: ${error.message}`);

        results.push({
          step: i + 1,
          command,
          success: false,
          error: error.message,
        });

        allSuccess = false;

        if (options.stopOnError !== false) {
          break;
        }
      }
    }

    return {
      success: allSuccess,
      results,
      totalSteps: commands.length,
      completedSteps: results.filter(r => r.success).length,
    };
  }

  // ============================================
  // UTILITIES
  // ============================================

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  getExecutionHistory(limit = 10) {
    return this.executionHistory.slice(-limit);
  }

  clearHistory() {
    this.executionHistory = [];
  }

  getStats() {
    return {
      totalExecutions: this.executionHistory.length,
      successfulExecutions: this.executionHistory.filter(e => e.success).length,
      failedExecutions: this.executionHistory.filter(e => !e.success).length,
      platform: this.platform,
      config: this.config,
    };
  }
}

export default UniversalExecutor;

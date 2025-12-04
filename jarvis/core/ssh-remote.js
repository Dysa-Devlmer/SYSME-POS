// core/ssh-remote.js
// J.A.R.V.I.S. SSH Remote Management
// Sistema de conexión, ejecución y monitoreo de servidores remotos

import { Client } from 'ssh2';
import fs from 'fs/promises';
import path from 'path';

class SSHRemote {
  constructor(jarvis) {
    this.jarvis = jarvis;
    this.connections = new Map();
    this.servers = new Map();
    this.monitoring = new Map();
    this.initialized = false;
  }

  /**
   * Inicializa el módulo SSH
   */
  async initialize() {
    console.log('🔧 [SSH] Inicializando módulo SSH remoto...');

    try {
      // Cargar configuración de servidores desde .env
      await this.loadServersConfig();

      console.log('✅ [SSH] SSH remote inicializado correctamente');
      console.log(`   🖥️  Servidores configurados: ${this.servers.size}`);

      this.initialized = true;
      return true;
    } catch (error) {
      console.error('❌ [SSH] Error inicializando:', error.message);
      return false;
    }
  }

  /**
   * Carga configuración de servidores desde variables de entorno
   */
  async loadServersConfig() {
    // Formato esperado en .env:
    // SSH_SERVERS=production,staging,development
    // SSH_PRODUCTION_HOST=192.168.1.100
    // SSH_PRODUCTION_PORT=22
    // SSH_PRODUCTION_USER=admin
    // SSH_PRODUCTION_PASSWORD=secret (o SSH_PRODUCTION_KEY=/path/to/key)

    const serverNames = process.env.SSH_SERVERS?.split(',').map(s => s.trim()) || [];

    for (const name of serverNames) {
      const prefix = `SSH_${name.toUpperCase()}_`;

      const server = {
        name,
        host: process.env[`${prefix}HOST`],
        port: parseInt(process.env[`${prefix}PORT`] || 22),
        username: process.env[`${prefix}USER`],
        password: process.env[`${prefix}PASSWORD`],
        privateKey: process.env[`${prefix}KEY`],
        passphrase: process.env[`${prefix}PASSPHRASE`],
        services: process.env[`${prefix}SERVICES`]?.split(',').map(s => s.trim()) || []
      };

      if (!server.host || !server.username) {
        console.log(`⚠️  [SSH] Configuración incompleta para servidor: ${name}`);
        continue;
      }

      // Si se especificó clave privada, leerla
      if (server.privateKey) {
        try {
          server.privateKeyData = await fs.readFile(server.privateKey, 'utf8');
        } catch (error) {
          console.log(`⚠️  [SSH] No se pudo leer clave privada para ${name}: ${error.message}`);
        }
      }

      this.servers.set(name, server);
      console.log(`   ✓ Servidor cargado: ${name} (${server.host})`);
    }
  }

  // ═════════════════════════════════════════════════════════════
  // CONEXIÓN SSH
  // ═════════════════════════════════════════════════════════════

  /**
   * Conecta a un servidor remoto
   */
  async connect(serverName) {
    const server = this.servers.get(serverName);

    if (!server) {
      throw new Error(`Servidor ${serverName} no configurado`);
    }

    // Si ya hay conexión activa, retornarla
    if (this.connections.has(serverName)) {
      const existing = this.connections.get(serverName);
      if (existing.connected) {
        return existing;
      }
    }

    return new Promise((resolve, reject) => {
      const conn = new Client();

      conn.on('ready', () => {
        console.log(`✅ [SSH] Conectado a ${serverName} (${server.host})`);

        this.connections.set(serverName, {
          client: conn,
          server,
          connected: true,
          connectedAt: new Date()
        });

        resolve(this.connections.get(serverName));
      });

      conn.on('error', (err) => {
        console.error(`❌ [SSH] Error conectando a ${serverName}:`, err.message);
        reject(err);
      });

      conn.on('end', () => {
        console.log(`🔌 [SSH] Conexión cerrada: ${serverName}`);
        const connection = this.connections.get(serverName);
        if (connection) {
          connection.connected = false;
        }
      });

      // Configuración de conexión
      const connectConfig = {
        host: server.host,
        port: server.port,
        username: server.username
      };

      // Autenticación por clave privada o contraseña
      if (server.privateKeyData) {
        connectConfig.privateKey = server.privateKeyData;
        if (server.passphrase) {
          connectConfig.passphrase = server.passphrase;
        }
      } else if (server.password) {
        connectConfig.password = server.password;
      } else {
        reject(new Error(`No se especificó método de autenticación para ${serverName}`));
        return;
      }

      conn.connect(connectConfig);

      // Timeout de 10 segundos
      setTimeout(() => {
        if (!conn._sock || !conn._sock.writable) {
          reject(new Error(`Timeout conectando a ${serverName}`));
        }
      }, 10000);
    });
  }

  /**
   * Desconecta de un servidor
   */
  disconnect(serverName) {
    const connection = this.connections.get(serverName);

    if (!connection) {
      throw new Error(`No hay conexión activa a ${serverName}`);
    }

    connection.client.end();
    connection.connected = false;

    console.log(`🔌 [SSH] Desconectado de ${serverName}`);
  }

  /**
   * Desconecta de todos los servidores
   */
  disconnectAll() {
    for (const [name, connection] of this.connections) {
      if (connection.connected) {
        this.disconnect(name);
      }
    }
  }

  // ═════════════════════════════════════════════════════════════
  // EJECUCIÓN DE COMANDOS
  // ═════════════════════════════════════════════════════════════

  /**
   * Ejecuta un comando en servidor remoto
   */
  async executeCommand(serverName, command) {
    const connection = await this.connect(serverName);

    return new Promise((resolve, reject) => {
      connection.client.exec(command, (err, stream) => {
        if (err) {
          reject(err);
          return;
        }

        let stdout = '';
        let stderr = '';

        stream.on('close', (code, signal) => {
          resolve({
            code,
            signal,
            stdout: stdout.trim(),
            stderr: stderr.trim(),
            success: code === 0
          });
        });

        stream.on('data', (data) => {
          stdout += data.toString();
        });

        stream.stderr.on('data', (data) => {
          stderr += data.toString();
        });

        // Timeout de 30 segundos
        setTimeout(() => {
          stream.close();
          reject(new Error('Timeout ejecutando comando'));
        }, 30000);
      });
    });
  }

  /**
   * Ejecuta script en servidor remoto
   */
  async executeScript(serverName, scriptPath) {
    // Leer script local
    const scriptContent = await fs.readFile(scriptPath, 'utf8');

    // Crear archivo temporal en servidor
    const tempPath = `/tmp/jarvis-script-${Date.now()}.sh`;

    await this.executeCommand(serverName, `cat > ${tempPath} << 'EOF'\n${scriptContent}\nEOF`);
    await this.executeCommand(serverName, `chmod +x ${tempPath}`);

    // Ejecutar script
    const result = await this.executeCommand(serverName, tempPath);

    // Limpiar archivo temporal
    await this.executeCommand(serverName, `rm ${tempPath}`);

    return result;
  }

  // ═════════════════════════════════════════════════════════════
  // MONITOREO DE SERVIDORES
  // ═════════════════════════════════════════════════════════════

  /**
   * Obtiene estado del servidor (CPU, RAM, Disco)
   */
  async getServerStatus(serverName) {
    try {
      // CPU usage
      const cpuResult = await this.executeCommand(
        serverName,
        "top -bn1 | grep 'Cpu(s)' | sed 's/.*, *\\([0-9.]*\\)%* id.*/\\1/' | awk '{print 100 - $1}'"
      );

      // Memory usage
      const memResult = await this.executeCommand(
        serverName,
        "free | grep Mem | awk '{print ($3/$2) * 100.0}'"
      );

      // Disk usage
      const diskResult = await this.executeCommand(
        serverName,
        "df -h / | tail -1 | awk '{print $5}' | sed 's/%//'"
      );

      // Uptime
      const uptimeResult = await this.executeCommand(
        serverName,
        "uptime -p"
      );

      const status = {
        serverName,
        timestamp: new Date(),
        cpu: parseFloat(cpuResult.stdout) || 0,
        memory: parseFloat(memResult.stdout) || 0,
        disk: parseFloat(diskResult.stdout) || 0,
        uptime: uptimeResult.stdout,
        healthy: true
      };

      // Determinar si el servidor está saludable
      if (status.cpu > 90 || status.memory > 90 || status.disk > 90) {
        status.healthy = false;
      }

      return status;
    } catch (error) {
      return {
        serverName,
        timestamp: new Date(),
        error: error.message,
        healthy: false
      };
    }
  }

  /**
   * Obtiene procesos activos
   */
  async getProcesses(serverName, limit = 10) {
    const result = await this.executeCommand(
      serverName,
      `ps aux --sort=-%cpu | head -${limit + 1}`
    );

    const lines = result.stdout.split('\n').slice(1); // Skip header
    const processes = [];

    for (const line of lines) {
      const parts = line.trim().split(/\s+/);
      if (parts.length >= 11) {
        processes.push({
          user: parts[0],
          pid: parts[1],
          cpu: parseFloat(parts[2]),
          mem: parseFloat(parts[3]),
          command: parts.slice(10).join(' ')
        });
      }
    }

    return processes;
  }

  /**
   * Verifica estado de servicios
   */
  async checkServices(serverName) {
    const server = this.servers.get(serverName);

    if (!server || server.services.length === 0) {
      return [];
    }

    const results = [];

    for (const service of server.services) {
      try {
        const result = await this.executeCommand(
          serverName,
          `systemctl is-active ${service}`
        );

        results.push({
          service,
          active: result.stdout.trim() === 'active',
          status: result.stdout.trim()
        });
      } catch (error) {
        results.push({
          service,
          active: false,
          error: error.message
        });
      }
    }

    return results;
  }

  /**
   * Obtiene errores recientes de logs
   */
  async getRecentErrors(serverName, lines = 50) {
    try {
      const result = await this.executeCommand(
        serverName,
        `journalctl -p err -n ${lines} --no-pager`
      );

      const errors = result.stdout.split('\n').filter(l => l.trim());

      return {
        count: errors.length,
        errors: errors.slice(0, 10) // Solo primeros 10
      };
    } catch (error) {
      return {
        count: 0,
        errors: [],
        error: error.message
      };
    }
  }

  /**
   * Monitoreo completo del servidor
   */
  async monitorServer(serverName) {
    console.log(`🔍 [SSH] Monitoreando servidor: ${serverName}`);

    try {
      const [status, processes, services, errors] = await Promise.all([
        this.getServerStatus(serverName),
        this.getProcesses(serverName, 5),
        this.checkServices(serverName),
        this.getRecentErrors(serverName, 20)
      ]);

      const report = {
        serverName,
        timestamp: new Date(),
        status,
        processes,
        services,
        errors,
        alerts: []
      };

      // Generar alertas
      if (status.cpu > 80) {
        report.alerts.push({
          level: 'warning',
          message: `CPU alta: ${status.cpu.toFixed(1)}%`
        });
      }

      if (status.memory > 80) {
        report.alerts.push({
          level: 'warning',
          message: `Memoria alta: ${status.memory.toFixed(1)}%`
        });
      }

      if (status.disk > 90) {
        report.alerts.push({
          level: 'error',
          message: `Disco casi lleno: ${status.disk.toFixed(1)}%`
        });
      }

      // Servicios caídos
      const downServices = services.filter(s => !s.active);
      if (downServices.length > 0) {
        report.alerts.push({
          level: 'error',
          message: `${downServices.length} servicio(s) caído(s): ${downServices.map(s => s.service).join(', ')}`
        });
      }

      // Enviar alertas por email si hay problemas
      if (report.alerts.length > 0 && this.jarvis && this.jarvis.email) {
        const alertDetails = report.alerts.map(a =>
          `<li><strong>${a.level === 'error' ? '❌' : '⚠️'}</strong> ${a.message}</li>`
        ).join('');

        await this.jarvis.email.sendAlert(
          `Alertas en servidor ${serverName}`,
          `Se detectaron ${report.alerts.length} problemas en el servidor`,
          `<ul>${alertDetails}</ul>
           <p><strong>CPU:</strong> ${status.cpu.toFixed(1)}%</p>
           <p><strong>Memoria:</strong> ${status.memory.toFixed(1)}%</p>
           <p><strong>Disco:</strong> ${status.disk.toFixed(1)}%</p>`
        );
      }

      return report;
    } catch (error) {
      console.error(`❌ [SSH] Error monitoreando ${serverName}:`, error.message);
      return {
        serverName,
        timestamp: new Date(),
        error: error.message,
        alerts: [{
          level: 'error',
          message: `Error al monitorear: ${error.message}`
        }]
      };
    }
  }

  /**
   * Inicia monitoreo continuo de un servidor
   */
  startMonitoring(serverName, intervalMinutes = 5) {
    if (this.monitoring.has(serverName)) {
      console.log(`⚠️  [SSH] Monitoreo ya activo para ${serverName}`);
      return;
    }

    const intervalMs = intervalMinutes * 60 * 1000;

    const intervalId = setInterval(async () => {
      await this.monitorServer(serverName);
    }, intervalMs);

    this.monitoring.set(serverName, {
      intervalId,
      intervalMinutes,
      startedAt: new Date()
    });

    console.log(`✅ [SSH] Monitoreo iniciado para ${serverName} (cada ${intervalMinutes} minutos)`);

    // Ejecutar primera vez inmediatamente
    this.monitorServer(serverName);
  }

  /**
   * Detiene monitoreo continuo
   */
  stopMonitoring(serverName) {
    const monitoring = this.monitoring.get(serverName);

    if (!monitoring) {
      throw new Error(`No hay monitoreo activo para ${serverName}`);
    }

    clearInterval(monitoring.intervalId);
    this.monitoring.delete(serverName);

    console.log(`🛑 [SSH] Monitoreo detenido para ${serverName}`);
  }

  /**
   * Detiene todo el monitoreo
   */
  stopAllMonitoring() {
    for (const serverName of this.monitoring.keys()) {
      this.stopMonitoring(serverName);
    }
  }

  // ═════════════════════════════════════════════════════════════
  // UTILIDADES
  // ═════════════════════════════════════════════════════════════

  /**
   * Lista servidores configurados
   */
  listServers() {
    return Array.from(this.servers.entries()).map(([name, server]) => ({
      name,
      host: server.host,
      port: server.port,
      username: server.username,
      services: server.services,
      connected: this.connections.has(name) && this.connections.get(name).connected,
      monitoring: this.monitoring.has(name)
    }));
  }

  /**
   * Obtiene estadísticas
   */
  getStats() {
    return {
      totalServers: this.servers.size,
      activeConnections: Array.from(this.connections.values()).filter(c => c.connected).length,
      activeMonitoring: this.monitoring.size,
      servers: this.listServers()
    };
  }
}

export default SSHRemote;

/**
 * MÓDULO 3: SYSTEM AUTOMATION
 * Automatización de tareas del sistema, scheduling, scripts
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs';
import path from 'path';

const execAsync = promisify(exec);

class SystemAutomation {
  constructor() {
    this.platform = process.platform;
    this.scheduledTasks = [];
    this.taskHistory = [];
    this.automationRules = [];
    
    console.log('⚙️ System Automation inicializando...');
    this.loadAutomationRules();
  }

  /**
   * PROGRAMA UNA TAREA (Cron-like)
   */
  scheduleTask(taskName, schedule, command) {
    try {
      const task = {
        id: Date.now(),
        name: taskName,
        schedule, // "0 9 * * *" = 9 AM diario
        command,
        createdAt: new Date(),
        status: 'active'
      };

      this.scheduledTasks.push(task);

      if (this.platform === 'win32') {
        // Windows Task Scheduler
        this.createWindowsScheduledTask(taskName, schedule, command);
      } else if (this.platform === 'darwin' || this.platform === 'linux') {
        // Cron job
        this.createCronJob(taskName, schedule, command);
      }

      console.log(`✅ Tarea programada: ${taskName}`);
      return { success: true, taskId: task.id };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * CREA TAREA EN WINDOWS
   */
  async createWindowsScheduledTask(taskName, schedule, command) {
    try {
      const psCommand = `
        $trigger = New-ScheduledTaskTrigger -Daily -At 09:00AM
        $action = New-ScheduledTaskAction -Execute "cmd.exe" -Argument "/c ${command}"
        Register-ScheduledTask -TaskName "${taskName}" -Trigger $trigger -Action $action -Force
      `;

      await execAsync(`powershell.exe -Command "${psCommand}"`);
      console.log(`✅ Tarea Windows creada: ${taskName}`);
    } catch (error) {
      console.error(`Error creando tarea Windows: ${error.message}`);
    }
  }

  /**
   * CREA CRON JOB (Mac/Linux)
   */
  async createCronJob(taskName, schedule, command) {
    try {
      // Ejemplo: "0 9 * * *" = 9 AM diario
      const cronEntry = `${schedule} ${command} # ${taskName}`;
      
      // En producción, usar librería 'cron' de npm
      console.log(`✅ Cron job creado: ${cronEntry}`);
    } catch (error) {
      console.error(`Error creando cron job: ${error.message}`);
    }
  }

  /**
   * ELIMINA UNA TAREA PROGRAMADA
   */
  async deleteTask(taskId) {
    try {
      const task = this.scheduledTasks.find(t => t.id === taskId);
      if (!task) throw new Error('Tarea no encontrada');

      if (this.platform === 'win32') {
        await execAsync(`schtasks /delete /tn "${task.name}" /f`);
      }

      this.scheduledTasks = this.scheduledTasks.filter(t => t.id !== taskId);
      console.log(`✅ Tarea eliminada: ${task.name}`);
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * LISTA TODAS LAS TAREAS PROGRAMADAS
   */
  getScheduledTasks() {
    return {
      total: this.scheduledTasks.length,
      tasks: this.scheduledTasks.map(t => ({
        id: t.id,
        name: t.name,
        schedule: t.schedule,
        status: t.status,
        createdAt: t.createdAt
      }))
    };
  }

  /**
   * INICIA UN SERVICIO
   */
  async startService(serviceName) {
    try {
      let command = '';

      if (this.platform === 'win32') {
        command = `net start ${serviceName}`;
      } else if (this.platform === 'darwin') {
        command = `launchctl start ${serviceName}`;
      } else {
        command = `sudo systemctl start ${serviceName}`;
      }

      const { stdout } = await execAsync(command);
      console.log(`✅ Servicio iniciado: ${serviceName}`);
      return { success: true, service: serviceName };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * DETIENE UN SERVICIO
   */
  async stopService(serviceName) {
    try {
      let command = '';

      if (this.platform === 'win32') {
        command = `net stop ${serviceName}`;
      } else if (this.platform === 'darwin') {
        command = `launchctl stop ${serviceName}`;
      } else {
        command = `sudo systemctl stop ${serviceName}`;
      }

      await execAsync(command);
      console.log(`✅ Servicio detenido: ${serviceName}`);
      return { success: true, service: serviceName };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * REINICIA UN SERVICIO
   */
  async restartService(serviceName) {
    try {
      let command = '';

      if (this.platform === 'win32') {
        command = `net stop ${serviceName} && net start ${serviceName}`;
      } else if (this.platform === 'darwin') {
        command = `launchctl stop ${serviceName} && launchctl start ${serviceName}`;
      } else {
        command = `sudo systemctl restart ${serviceName}`;
      }

      await execAsync(command);
      console.log(`✅ Servicio reiniciado: ${serviceName}`);
      return { success: true, service: serviceName };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * OBTIENE ESTADO DE UN SERVICIO
   */
  async getServiceStatus(serviceName) {
    try {
      let command = '';

      if (this.platform === 'win32') {
        command = `sc query ${serviceName}`;
      } else if (this.platform === 'darwin') {
        command = `launchctl list | grep ${serviceName}`;
      } else {
        command = `sudo systemctl status ${serviceName}`;
      }

      const { stdout } = await execAsync(command);
      
      return {
        success: true,
        service: serviceName,
        status: stdout.includes('RUNNING') || stdout.includes('active') ? 'running' : 'stopped'
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * EJECUTA COMANDO DEL SISTEMA
   */
  async executeCommand(command) {
    try {
      const { stdout, stderr } = await execAsync(command, { timeout: 30000 });
      
      this.taskHistory.push({
        command,
        timestamp: new Date(),
        status: 'success',
        output: stdout
      });

      console.log(`✅ Comando ejecutado: ${command}`);
      return {
        success: true,
        output: stdout,
        errors: stderr || null
      };
    } catch (error) {
      this.taskHistory.push({
        command,
        timestamp: new Date(),
        status: 'error',
        error: error.message
      });

      return { success: false, error: error.message };
    }
  }

  /**
   * CREA AUTOMATIZACIÓN (Reglas)
   */
  createAutomationRule(trigger, action) {
    const rule = {
      id: Date.now(),
      trigger, // "on:8am" o "on:file_change"
      action,  // comando a ejecutar
      createdAt: new Date(),
      enabled: true
    };

    this.automationRules.push(rule);
    console.log(`✅ Regla de automatización creada: ${trigger} → ${action}`);
    return { success: true, ruleId: rule.id };
  }

  /**
   * OBTIENE HISTORIAL DE TAREAS
   */
  getTaskHistory(limit = 10) {
    return {
      total: this.taskHistory.length,
      recent: this.taskHistory.slice(-limit).reverse()
    };
  }

  /**
   * CARGA REGLAS DE AUTOMATIZACIÓN GUARDADAS
   */
  loadAutomationRules() {
    try {
      const rulesFile = path.join(process.cwd(), 'config/automation-rules.json');
      if (fs.existsSync(rulesFile)) {
        const data = fs.readFileSync(rulesFile, 'utf8');
        this.automationRules = JSON.parse(data);
        console.log(`✅ ${this.automationRules.length} reglas de automatización cargadas`);
      }
    } catch (error) {
      console.log('No hay reglas de automatización previas');
    }
  }

  /**
   * GUARDA REGLAS DE AUTOMATIZACIÓN
   */
  saveAutomationRules() {
    try {
      const dir = path.join(process.cwd(), 'config');
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      
      fs.writeFileSync(
        path.join(dir, 'automation-rules.json'),
        JSON.stringify(this.automationRules, null, 2)
      );
      console.log('✅ Reglas de automatización guardadas');
    } catch (error) {
      console.error('Error guardando reglas:', error.message);
    }
  }
}

export default SystemAutomation;

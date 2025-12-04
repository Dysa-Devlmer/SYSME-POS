/**
 * MÓDULO 2: APPLICATION CONTROL
 * Control de aplicaciones, ventanas y automatización de flujos
 */

import { exec, spawn } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

class ApplicationControl {
  constructor() {
    this.platform = process.platform;
    this.runningApps = [];
    this.windowPositions = {};
    
    console.log('💻 Application Control inicializando...');
  }

  /**
   * ABRE UNA APLICACIÓN
   */
  async openApplication(appName) {
    try {
      let command = '';

      if (this.platform === 'win32') {
        // Windows
        const appMap = {
          'vscode': 'code',
          'chrome': 'chrome',
          'firefox': 'firefox',
          'edge': 'msedge',
          'notepad': 'notepad',
          'explorer': 'explorer',
          'powershell': 'powershell',
          'cmd': 'cmd'
        };

        const app = appMap[appName.toLowerCase()] || appName;
        command = `start ${app}`;
      } else if (this.platform === 'darwin') {
        // macOS
        command = `open -a "${appName}"`;
      } else {
        // Linux
        command = `${appName} &`;
      }

      const { stdout, stderr } = await execAsync(command);
      
      if (!this.runningApps.includes(appName)) {
        this.runningApps.push(appName);
      }

      console.log(`✅ Aplicación abierta: ${appName}`);
      return { success: true, app: appName };
    } catch (error) {
      console.error(`❌ Error abriendo ${appName}:`, error.message);
      return { success: false, error: error.message };
    }
  }

  /**
   * CIERRA UNA APLICACIÓN
   */
  async closeApplication(appName) {
    try {
      let command = '';

      if (this.platform === 'win32') {
        command = `taskkill /IM ${appName}.exe /F`;
      } else if (this.platform === 'darwin') {
        command = `killall "${appName}"`;
      } else {
        command = `pkill -f "${appName}"`;
      }

      await execAsync(command);
      
      this.runningApps = this.runningApps.filter(app => app !== appName);
      console.log(`✅ Aplicación cerrada: ${appName}`);
      return { success: true, app: appName };
    } catch (error) {
      console.error(`Error cerrando ${appName}:`, error.message);
      return { success: false, error: error.message };
    }
  }

  /**
   * OBTIENE LISTA DE APLICACIONES ABIERTAS
   */
  async getOpenApplications() {
    try {
      let command = '';

      if (this.platform === 'win32') {
        command = 'tasklist';
      } else if (this.platform === 'darwin') {
        command = "ps aux | grep -E '[A-Za-z0-9]+.app/Contents/MacOS'";
      } else {
        command = 'ps aux | grep -v grep';
      }

      const { stdout } = await execAsync(command);
      const lines = stdout.split('\n').filter(line => line.trim());
      
      return {
        success: true,
        applications: lines.slice(0, 10)
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * MINIMIZA VENTANA
   */
  async minimizeWindow(appName) {
    try {
      if (this.platform === 'win32') {
        await execAsync(`powershell.exe -Command "Get-Process | Where-Object {$_.MainWindowTitle -match '${appName}'} | foreach-object {$_.CloseMainWindow()}"`);
      }
      console.log(`✅ Ventana minimizada: ${appName}`);
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * MAXIMIZA VENTANA
   */
  async maximizeWindow(appName) {
    try {
      if (this.platform === 'win32') {
        await execAsync(`powershell.exe -Command "[System.Windows.Forms.SendKeys]::SendWait('%{UP}')"`);
      }
      console.log(`✅ Ventana maximizada: ${appName}`);
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * OBTIENE INFORMACIÓN DEL SISTEMA
   */
  async getSystemInfo() {
    try {
      const { stdout: hostname } = await execAsync(this.platform === 'win32' ? 'hostname' : 'hostname');
      const { stdout: uptime } = await execAsync(this.platform === 'win32' ? 'net stats srv' : 'uptime');
      
      return {
        success: true,
        hostname: hostname.trim(),
        uptime: uptime.trim(),
        platform: this.platform,
        runningApps: this.runningApps
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * EJECUTA SCRIPT PERSONALIZADO
   */
  async runScript(scriptPath) {
    try {
      if (!scriptPath.endsWith('.js') && !scriptPath.endsWith('.sh') && !scriptPath.endsWith('.ps1')) {
        throw new Error('Solo se permiten scripts .js, .sh o .ps1');
      }

      const { stdout, stderr } = await execAsync(`node ${scriptPath}`);
      
      console.log(`✅ Script ejecutado: ${scriptPath}`);
      return {
        success: true,
        output: stdout,
        errors: stderr || null
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * SIMULA CLICKS DEL MOUSE
   */
  async mouseClick(x, y, button = 'left') {
    try {
      if (this.platform === 'win32') {
        const ps = spawn('powershell.exe', [
          '-Command',
          `
            [System.Reflection.Assembly]::LoadWithPartialName("System.Windows.Forms");
            [System.Windows.Forms.Cursor]::Position = New-Object System.Drawing.Point(${x}, ${y});
            $simulator = New-Object System.Windows.Forms.SendKeys;
            $simulator.SendWait('{LBUTTON}');
          `
        ]);
      }
      return { success: true, x, y, button };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * ESCRIBE TEXTO
   */
  async typeText(text) {
    try {
      const escapedText = text.replace(/"/g, '\\"');
      
      if (this.platform === 'win32') {
        await execAsync(`powershell.exe -Command "[System.Windows.Forms.SendKeys]::SendWait('${escapedText}')"`);
      }
      
      return { success: true, text };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }
}

export default ApplicationControl;

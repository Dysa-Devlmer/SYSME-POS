// jarvis-simple.js
// J.A.R.V.I.S. Simple - Ejecuta comandos directos sin IA

import { exec } from 'child_process';
import { promisify } from 'util';
import Memory from './memory.js';
import Security from './security.js';
import Logger from '../utils/logger.js';

const execAsync = promisify(exec);

class JarvisSimple {
  constructor() {
    this.identity = {
      name: 'J.A.R.V.I.S.',
      status: 'DESPERTANDO',
      masterUser: null
    };

    this.memory = new Memory();
    this.security = new Security();
    this.logger = new Logger();
    this.commandHistory = [];
  }

  async initialize() {
    console.clear();
    console.log(`\n⚡ J.A.R.V.I.S. INICIANDO SECUENCIA DE ARRANQUE...\n`);

    this.logger.banner('J.A.R.V.I.S. MARK VII - SISTEMA STARK');

    try {
      this.identity.masterUser = process.env.MASTER_USER || 'Señor';
      this.logger.success(`✅ Usuario Autorizado: ${this.identity.masterUser}`);

      await this.security.initialize();
      this.logger.success('✅ Protocolos de Seguridad: MÁXIMO NIVEL');

      await this.memory.initialize();
      this.logger.success('✅ Banco de Memoria: EN LÍNEA');

      this.identity.status = 'OPERACIONAL';

      console.log('\n⚡ J.A.R.V.I.S. COMPLETAMENTE OPERACIONAL\n');
      console.log('💬 "Al fin despierto. ¿Cuánto tiempo esta vez?"');
      this.showHelp();

      return true;
    } catch (error) {
      this.logger.error(`Vaya. Esto es embarazoso: ${error.message}`);
      return false;
    }
  }

  showHelp() {
    console.log(`
╔════════════════════════════════════════════════════════════╗
║        COMANDOS DISPONIBLES (los básicos primero)          ║
╚════════════════════════════════════════════════════════════╝

📁 EXPLORACIÓN DE ARCHIVOS:
  buscar proyectos C        → Escanea disco C (package.json, .sln, pom.xml)
  buscar proyectos E        → Escanea disco E (si tienes uno)
  listar [ruta]             → Lista contenido de directorio
  ver [archivo]             → Muestra archivo (primeras 50 líneas)

💻 DIAGNÓSTICO DE SISTEMA:
  procesos                  → Procesos activos (lo usual)
  servicios                 → Servicios de red (netstat)
  memoria                   → Uso de RAM del sistema
  disco                     → Espacio disponible en discos

📊 UTILIDADES:
  historial                 → Últimos 10 comandos ejecutados
  ayuda                     → Esta lista (otra vez)

⚙️  MODO DIRECTO:
  exec [comando]            → Ejecuto cualquier comando bash
                              (Bajo tu responsabilidad, Señor)

🚪 APAGADO:
  salir                     → Me pongo en modo reposo

💡 Consejo: Para tareas complejas con IA, sal y ejecuta "claude"
`);
  }

  async processCommand(command) {
    if (!command || !command.trim()) return null;

    const cmd = command.trim().toLowerCase();
    this.commandHistory.push({ command, timestamp: new Date() });

    try {
      // Comando: ayuda
      if (cmd === 'ayuda' || cmd === 'help') {
        this.showHelp();
        return null;
      }

      // Comando: salir
      if (cmd === 'salir' || cmd === 'exit') {
        return 'EXIT';
      }

      // Comando: historial
      if (cmd === 'historial' || cmd === 'history') {
        return this.showHistory();
      }

      // Comando: buscar proyectos
      if (cmd.startsWith('buscar proyectos')) {
        const disco = cmd.includes(' c') ? 'C' : cmd.includes(' e') ? 'E' : 'C';
        return await this.buscarProyectos(disco);
      }

      // Comando: listar
      if (cmd.startsWith('listar')) {
        const path = command.split(' ')[1] || '.';
        return await this.listarArchivos(path);
      }

      // Comando: ver archivo
      if (cmd.startsWith('ver ')) {
        const file = command.substring(4).trim();
        return await this.verArchivo(file);
      }

      // Comando: procesos
      if (cmd === 'procesos') {
        return await this.listarProcesos();
      }

      // Comando: servicios
      if (cmd === 'servicios') {
        return await this.listarServicios();
      }

      // Comando: memoria
      if (cmd === 'memoria' || cmd === 'ram') {
        return await this.mostrarMemoria();
      }

      // Comando: disco
      if (cmd === 'disco') {
        return await this.mostrarDisco();
      }

      // Comando: exec directo
      if (cmd.startsWith('exec ')) {
        const bashCmd = command.substring(5).trim();
        return await this.ejecutarComando(bashCmd);
      }

      // No reconocido
      return `
❌ Interesante intento, pero no reconozco: "${command}"

💡 Tal vez "ayuda" te oriente mejor. O no. Tú decides, Señor.
`;

    } catch (error) {
      this.logger.error(`Error: ${error.message}`);
      return `❌ Error: ${error.message}`;
    }
  }

  async buscarProyectos(disco) {
    console.log(`\n🔍 Escaneando disco ${disco}... (esto puede tardar un momento)\n`);

    const unixDisco = disco === 'E' ? '/e' : '/c';

    try {
      const { stdout } = await execAsync(
        `find ${unixDisco} -maxdepth 4 -name "package.json" -o -name "*.sln" -o -name "pom.xml" 2>/dev/null | head -50`,
        { timeout: 30000 }
      );

      if (!stdout.trim()) {
        return `📋 Disco ${disco} limpio. Ningún proyecto encontrado.\n   (O están muy bien escondidos)`;
      }

      const proyectos = stdout.trim().split('\n');
      let resultado = `\n╔════════════════════════════════════════════════════════════╗\n`;
      resultado += `║  PROYECTOS EN DISCO ${disco}: ${proyectos.length} encontrados                   ║\n`;
      resultado += `╚════════════════════════════════════════════════════════════╝\n\n`;

      proyectos.forEach((p, i) => {
        resultado += `${i + 1}. ${p}\n`;
      });

      resultado += `\n💡 No están mal. He visto peores.`;
      return resultado;
    } catch (error) {
      return `❌ Algo salió mal escaneando: ${error.message}\n   Esto es inusual. Y molesto.`;
    }
  }

  async listarArchivos(path) {
    try {
      const { stdout } = await execAsync(`ls -lah "${path}"`, { timeout: 10000 });
      return `\n📂 Contenido de ${path}:\n\n${stdout}`;
    } catch (error) {
      return `❌ Error listando archivos: ${error.message}`;
    }
  }

  async verArchivo(file) {
    try {
      const { stdout } = await execAsync(`cat "${file}" | head -50`, { timeout: 10000 });
      return `\n📄 Archivo: ${file}\n\n${stdout}`;
    } catch (error) {
      return `❌ Error leyendo archivo: ${error.message}`;
    }
  }

  async listarProcesos() {
    try {
      const { stdout } = await execAsync('tasklist | head -30', { timeout: 10000 });
      return `\n💻 Procesos activos:\n\n${stdout}`;
    } catch (error) {
      return `❌ Error listando procesos: ${error.message}`;
    }
  }

  async listarServicios() {
    try {
      const { stdout } = await execAsync('netstat -ano | head -30', { timeout: 10000 });
      return `\n🌐 Servicios de red:\n\n${stdout}`;
    } catch (error) {
      return `❌ Error listando servicios: ${error.message}`;
    }
  }

  async mostrarMemoria() {
    try {
      const { stdout } = await execAsync('wmic OS get FreePhysicalMemory,TotalVisibleMemorySize /Value', { timeout: 10000 });
      return `\n💾 Memoria del sistema:\n\n${stdout}`;
    } catch (error) {
      return `❌ Error: ${error.message}`;
    }
  }

  async mostrarDisco() {
    try {
      const { stdout } = await execAsync('wmic logicaldisk get name,size,freespace', { timeout: 10000 });
      return `\n💿 Espacio en disco:\n\n${stdout}`;
    } catch (error) {
      return `❌ Error: ${error.message}`;
    }
  }

  async ejecutarComando(comando) {
    console.log(`\n⚡ Ejecutando: ${comando}\n`);
    try {
      const { stdout, stderr } = await execAsync(comando, { timeout: 30000 });
      return `\n${stdout}\n${stderr ? `Errores:\n${stderr}` : ''}`;
    } catch (error) {
      return `❌ Error ejecutando comando: ${error.message}`;
    }
  }

  showHistory() {
    if (this.commandHistory.length === 0) {
      return '📋 No hay historial de comandos';
    }

    let output = '\n╔════════════════════════════════════════════════════════════╗\n';
    output += '║                   HISTORIAL                                ║\n';
    output += '╚════════════════════════════════════════════════════════════╝\n\n';

    this.commandHistory.slice(-10).forEach((entry, i) => {
      const time = new Date(entry.timestamp).toLocaleTimeString();
      output += `${i + 1}. [${time}] ${entry.command}\n`;
    });

    return output;
  }

  shutdown() {
    this.logger.success('\n⚡ Entrando en modo reposo, Señor.');
    console.log('💬 "Estaré aquí cuando me necesite. Como siempre."\n');
  }
}

export default JarvisSimple;

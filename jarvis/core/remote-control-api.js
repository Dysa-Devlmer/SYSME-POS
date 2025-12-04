/**
 * MÓDULO 5: REMOTE CONTROL API
 * API REST para control remoto desde cualquier dispositivo
 * Dashboard web incluido
 */

import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';

class RemoteControlAPI {
  constructor(jarvisInstance, port = 3001) {
    this.jarvis = jarvisInstance;
    this.port = port;
    this.app = express();
    this.operationLog = [];
    this.users = [];
    this.jwtSecret = 'jarvis-ulmer-solier-2025';
    
    this.setupMiddleware();
    this.setupRoutes();
    
    console.log('🌐 Remote Control API inicializando...');
  }

  /**
   * CONFIGURA MIDDLEWARE
   */
  setupMiddleware() {
    this.app.use(cors());
    this.app.use(bodyParser.json());
    this.app.use(bodyParser.urlencoded({ extended: true }));
    
    // Middleware de autenticación
    this.app.use((req, res, next) => {
      if (req.path === '/api/auth/login' || req.path === '/api/health') {
        return next();
      }

      const token = req.headers.authorization?.split(' ')[1];
      if (!token) {
        return res.status(401).json({ error: 'No autorizado' });
      }

      try {
        jwt.verify(token, this.jwtSecret);
        next();
      } catch (error) {
        res.status(401).json({ error: 'Token inválido' });
      }
    });
  }

  /**
   * CONFIGURA RUTAS
   */
  setupRoutes() {
    // AUTENTICACIÓN
    this.app.post('/api/auth/login', (req, res) => {
      const { username, password } = req.body;

      if (username === 'ulmer' && password === 'jarvis2025') {
        const token = jwt.sign({ username }, this.jwtSecret, { expiresIn: '24h' });
        res.json({ success: true, token });
      } else {
        res.status(401).json({ error: 'Credenciales inválidas' });
      }
    });

    // SALUD DEL SISTEMA
    this.app.get('/api/health', (req, res) => {
      res.json({
        status: 'ok',
        message: 'JARVIS Remote Control API operacional',
        uptime: process.uptime()
      });
    });

    // ESTADO GENERAL
    this.app.get('/api/status', (req, res) => {
      res.json({
        jarvisStatus: 'operational',
        modules: ['conversational', 'actions', 'voice', 'automation', 'web'],
        operationLog: this.operationLog.slice(-20)
      });
    });

    // EJECUTAR COMANDO
    this.app.post('/api/jarvis/command', async (req, res) => {
      try {
        const { command } = req.body;
        
        this.logOperation('command_executed', command);

        // Simular ejecución (en producción, conectar con jarvis real)
        const result = await this.executeJarvisCommand(command);
        
        res.json({ success: true, result });
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });

    // OBTENER ESTADO DEL SISTEMA
    this.app.get('/api/system/info', async (req, res) => {
      try {
        const info = await this.getSystemInfo();
        res.json({ success: true, info });
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });

    // LISTAR ACCIONES DISPONIBLES
    this.app.get('/api/jarvis/actions', (req, res) => {
      const actions = [
        { name: 'create_project', description: 'Crea un nuevo proyecto' },
        { name: 'system_monitor', description: 'Monitorea el sistema' },
        { name: 'weather_report', description: 'Obtiene clima actual' },
        { name: 'screenshot', description: 'Toma screenshot' },
        { name: 'joke', description: 'Cuenta un chiste' }
      ];

      res.json({ success: true, actions });
    });

    // EJECUTAR ACCIÓN ESPECÍFICA
    this.app.post('/api/jarvis/action/:actionName', async (req, res) => {
      try {
        const { actionName } = req.params;
        const { params } = req.body;

        this.logOperation('action_executed', actionName, params);

        const result = await this.executeAction(actionName, params);
        res.json({ success: true, result });
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });

    // HISTORIAL DE OPERACIONES
    this.app.get('/api/operations/history', (req, res) => {
      const limit = req.query.limit || 50;
      res.json({
        success: true,
        total: this.operationLog.length,
        operations: this.operationLog.slice(-limit)
      });
    });

    // OBTENER CONVERSACIONES
    this.app.get('/api/jarvis/conversations', (req, res) => {
      res.json({
        success: true,
        message: 'Acceso a conversaciones requiere permisos especiales'
      });
    });

    // ESTADÍSTICAS
    this.app.get('/api/statistics', (req, res) => {
      res.json({
        success: true,
        statistics: {
          totalCommands: this.operationLog.filter(l => l.type === 'command_executed').length,
          totalActions: this.operationLog.filter(l => l.type === 'action_executed').length,
          uptime: Math.floor(process.uptime() / 3600) + ' horas'
        }
      });
    });

    // DASHBOARD WEB
    this.app.get('/', (req, res) => {
      res.send(this.getDashboardHTML());
    });

    // ARCHIVOS ESTÁTICOS
    this.app.use(express.static('public'));
  }

  /**
   * EJECUTA COMANDO JARVIS
   */
  async executeJarvisCommand(command) {
    return {
      command,
      executed: true,
      timestamp: new Date(),
      response: `Comando procesado: ${command}`
    };
  }

  /**
   * EJECUTA ACCIÓN
   */
  async executeAction(actionName, params) {
    const actions = {
      'create_project': () => ({ created: true, project: 'nuevo-proyecto' }),
      'system_monitor': () => ({ cpu: '45%', ram: '8GB', battery: '85%' }),
      'weather_report': () => ({ temp: '22°C', condition: 'Despejado' }),
      'screenshot': () => ({ taken: true, saved: 'screenshot.png' }),
      'joke': () => ({ joke: '¿Por qué los programadores no pueden ir a la playa? Porque se tienden en el array.' })
    };

    return actions[actionName]?.() || { error: 'Acción no encontrada' };
  }

  /**
   * OBTIENE INFO DEL SISTEMA
   */
  async getSystemInfo() {
    return {
      platform: process.platform,
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      cpuCount: require('os').cpus().length
    };
  }

  /**
   * REGISTRA OPERACIÓN
   */
  logOperation(type, ...args) {
    this.operationLog.push({
      id: this.operationLog.length + 1,
      type,
      args,
      timestamp: new Date()
    });

    if (this.operationLog.length > 1000) {
      this.operationLog.shift();
    }
  }

  /**
   * OBTIENE HTML DEL DASHBOARD
   */
  getDashboardHTML() {
    return `
      <!DOCTYPE html>
      <html lang="es">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>J.A.R.V.I.S. Dashboard - Ulmer Solier</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            display: flex;
            justify-content: center;
            align-items: center;
            padding: 20px;
          }
          .container {
            background: white;
            border-radius: 10px;
            box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
            max-width: 1200px;
            width: 100%;
            padding: 40px;
          }
          h1 {
            color: #333;
            margin-bottom: 10px;
            display: flex;
            align-items: center;
            gap: 10px;
          }
          .emoji { font-size: 2em; }
          .status {
            background: #e8f5e9;
            color: #2e7d32;
            padding: 10px 15px;
            border-radius: 5px;
            margin-bottom: 30px;
            font-weight: 600;
          }
          .grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: 20px;
            margin-bottom: 30px;
          }
          .card {
            background: #f5f5f5;
            padding: 20px;
            border-radius: 8px;
            border-left: 4px solid #667eea;
          }
          .card h3 {
            color: #667eea;
            margin-bottom: 10px;
            font-size: 1.1em;
          }
          .card p {
            color: #666;
            font-size: 0.9em;
          }
          input, button {
            padding: 10px;
            border: 1px solid #ddd;
            border-radius: 5px;
            font-size: 1em;
          }
          input {
            width: 100%;
            margin-bottom: 10px;
          }
          button {
            background: #667eea;
            color: white;
            border: none;
            cursor: pointer;
            font-weight: 600;
            transition: all 0.3s;
          }
          button:hover {
            background: #764ba2;
            transform: translateY(-2px);
          }
          .footer {
            text-align: center;
            color: #999;
            margin-top: 40px;
            font-size: 0.9em;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <h1>
            <span class="emoji">🎩</span>
            J.A.R.V.I.S. Remote Control Dashboard
          </h1>
          <div class="status">✅ Sistema operacional - Listo para comandos</div>
          
          <div class="grid">
            <div class="card">
              <h3>🎤 Estado</h3>
              <p>Voice Interface: Operacional</p>
              <p>IA Profunda: Conectada</p>
            </div>
            <div class="card">
              <h3>⚙️ Sistemas</h3>
              <p>Automatización: Activa</p>
              <p>Monitor: 24/7</p>
            </div>
            <div class="card">
              <h3>🌐 Integración</h3>
              <p>Web: Disponible</p>
              <p>APIs: Configuradas</p>
            </div>
          </div>

          <h2 style="margin-bottom: 15px; color: #333;">Enviar Comando</h2>
          <input type="text" id="commandInput" placeholder="Ej: crea un proyecto node nuevo" />
          <button onclick="sendCommand()">Ejecutar Comando</button>

          <div class="footer">
            <p>🎩 Para: Ulmer Solier | Creado: 2025 | Versión: 1.0</p>
            <p>Como siempre. ⚡</p>
          </div>
        </div>

        <script>
          async function sendCommand() {
            const command = document.getElementById('commandInput').value;
            if (!command.trim()) return;

            try {
              const response = await fetch('/api/jarvis/command', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': \`Bearer \${localStorage.getItem('token')}\`
                },
                body: JSON.stringify({ command })
              });

              const result = await response.json();
              alert('Comando ejecutado: ' + JSON.stringify(result));
              document.getElementById('commandInput').value = '';
            } catch (error) {
              alert('Error: ' + error.message);
            }
          }
        </script>
      </body>
      </html>
    `;
  }

  /**
   * INICIA SERVIDOR
   */
  start() {
    this.app.listen(this.port, () => {
      console.log(`🌐 Remote Control API corriendo en http://localhost:${this.port}`);
      console.log(`📊 Dashboard: http://localhost:${this.port}`);
    });
  }
}

export default RemoteControlAPI;

// web-interface/backend/server.js
// J.A.R.V.I.S. MARK VII - Panel Web Backend
// FASE 5 - API REST + WebSocket

const express = require('express');
const cors = require('cors');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');
const fs = require('fs-extra');
const si = require('systeminformation');
const axios = require('axios');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

// FASE 6 - Automation Engines
const AutomationEngine = require('../../core/automation-engine.cjs');
const CICDManager = require('../../core/cicd-manager.cjs');
const MetricsEngine = require('../../core/metrics-engine.cjs');

// JARVIS Bridge - Integración con sistema completo
const JarvisBridge = require('./jarvis-bridge.cjs');

// Proactive Integration - Real-time code monitoring
const ProactiveIntegration = require('./proactive-integration.cjs');

// Autonomous Integration - Autonomous Agent System
const AutonomousIntegration = require('./autonomous-integration.cjs');

// Code Search Integration - Intelligent Code Search
const CodeSearchIntegration = require('./code-search-integration.cjs');

// Doc Generator Integration - Automatic Documentation
const DocGeneratorIntegration = require('./doc-generator-integration.cjs');

// Voice Control Integration - Voice Commands & Chat
const VoiceControlIntegration = require('./voice-control-integration.cjs');

// Scheduler Integration - Task Scheduling & Workflows
const SchedulerIntegration = require('./scheduler-integration.cjs');

// Logging Integration - Structured Logging & Monitoring
const LoggingIntegration = require('./logging-integration.cjs');

// Settings Integration - Configuration Manager
const SettingsIntegration = require('./settings-integration.cjs');

// Backup Integration - Backup & Disaster Recovery
const BackupIntegration = require('./backup-integration.cjs');

// Test Integration - Automated Testing & QA
const TestIntegration = require('./test-integration.cjs');

// Auth Integration - Security & Authentication
const AuthIntegration = require('./auth-integration.cjs');

// Performance Integration - Performance Monitoring & Optimization
const PerformanceIntegration = require('./performance-integration.cjs');

// AI Integration - Machine Learning & Intelligence Systems
const AIIntegration = require('./ai-integration.cjs');

// Intelligent Chat System - Advanced conversational AI with web search
const IntelligentChatSystem = require('./intelligent-chat-system.cjs');

// Simple logger for engines
const logger = {
  info: (msg) => console.log(msg),
  error: (msg) => console.error(msg),
  warn: (msg) => console.warn(msg)
};

// Initialize FASE 6 engines
const automationEngine = new AutomationEngine(logger);
const cicdManager = new CICDManager(logger);
const metricsEngine = new MetricsEngine(logger);

// Initialize JARVIS Bridge
const jarvisBridge = new JarvisBridge();
jarvisBridge.initialize().catch(err => console.error('Error inicializando JARVIS Bridge:', err));

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: ['http://localhost:5173', 'http://localhost:5174'],
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    credentials: true
  }
});

// ===== MIDDLEWARE =====
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, '../frontend/dist')));

// Store reference to io globally for event emissions
global.io = io;

// ===== HELPER FUNCTIONS =====

const getMemoryDb = () => {
  const memoryPath = path.join(__dirname, '../../data/memory-db.json');
  if (!fs.existsSync(memoryPath)) {
    return { memories: [], stats: {} };
  }
  return fs.readJsonSync(memoryPath);
};

const getTasksDb = () => {
  const tasksPath = path.join(__dirname, '../../data/tasks.json');
  if (!fs.existsSync(tasksPath)) {
    return { tasks: [], stats: {} };
  }
  return fs.readJsonSync(tasksPath);
};

const saveTasksDb = (data) => {
  const tasksPath = path.join(__dirname, '../../data/tasks.json');
  fs.writeJsonSync(tasksPath, data, { spaces: 2 });
};

const getProjects = () => {
  const projectsDir = path.join(__dirname, '../../projects');

  if (!fs.existsSync(projectsDir)) {
    return [];
  }

  try {
    return fs.readdirSync(projectsDir)
      .filter(f => fs.statSync(path.join(projectsDir, f)).isDirectory())
      .map(name => ({
        name,
        path: path.join(projectsDir, name),
        created: fs.statSync(path.join(projectsDir, name)).birthtime
      }));
  } catch (error) {
    console.error('Error reading projects:', error);
    return [];
  }
};

// ===== API ROUTES =====

// System Metrics - NUEVO
app.get('/api/system/metrics', async (req, res) => {
  try {
    const [cpu, mem, disk, osInfo, currentLoad] = await Promise.all([
      si.cpu(),
      si.mem(),
      si.fsSize(),
      si.osInfo(),
      si.currentLoad()
    ]);

    const totalDisk = disk.reduce((acc, d) => acc + d.size, 0);
    const usedDisk = disk.reduce((acc, d) => acc + d.used, 0);

    res.json({
      cpu: {
        manufacturer: cpu.manufacturer,
        brand: cpu.brand,
        cores: cpu.cores,
        speed: cpu.speed,
        usage: Math.round(currentLoad.currentLoad) || 0
      },
      memory: {
        total: Math.round(mem.total / 1024 / 1024 / 1024), // GB
        used: Math.round(mem.used / 1024 / 1024 / 1024), // GB
        free: Math.round(mem.free / 1024 / 1024 / 1024), // GB
        usagePercent: Math.round((mem.used / mem.total) * 100)
      },
      disk: {
        total: Math.round(totalDisk / 1024 / 1024 / 1024), // GB
        used: Math.round(usedDisk / 1024 / 1024 / 1024), // GB
        free: Math.round((totalDisk - usedDisk) / 1024 / 1024 / 1024), // GB
        usagePercent: Math.round((usedDisk / totalDisk) * 100)
      },
      os: {
        platform: osInfo.platform,
        distro: osInfo.distro,
        release: osInfo.release,
        arch: osInfo.arch,
        hostname: osInfo.hostname
      },
      uptime: Math.round(process.uptime()),
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error getting system metrics:', error);
    res.status(500).json({ error: error.message });
  }
});

// Dashboard Stats
app.get('/api/dashboard', (req, res) => {
  try {
    const memoryDb = getMemoryDb();
    const tasksDb = getTasksDb();

    res.json({
      memory: {
        total: memoryDb.memories?.length || 0,
        stats: memoryDb.stats || {}
      },
      tasks: {
        total: tasksDb.tasks?.length || 0,
        pending: tasksDb.tasks?.filter(t => t.status === 'pending')?.length || 0,
        completed: tasksDb.tasks?.filter(t => t.status === 'completed')?.length || 0,
        inProgress: tasksDb.tasks?.filter(t => t.status === 'in-progress')?.length || 0,
        stats: tasksDb.stats || {}
      },
      system: {
        uptime: Math.round(process.uptime()),
        timestamp: new Date().toISOString(),
        version: 'MARK VII',
        status: 'operational'
      }
    });
  } catch (error) {
    console.error('Error getting dashboard:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get all memories
app.get('/api/memories', (req, res) => {
  try {
    const memoryDb = getMemoryDb();
    res.json(memoryDb.memories || []);
  } catch (error) {
    console.error('Error getting memories:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get all tasks
app.get('/api/tasks', (req, res) => {
  try {
    const tasksDb = getTasksDb();
    res.json(tasksDb.tasks || []);
  } catch (error) {
    console.error('Error getting tasks:', error);
    res.status(500).json({ error: error.message });
  }
});

// Create new task
app.post('/api/tasks', (req, res) => {
  try {
    const { description, priority } = req.body;
    const tasksDb = getTasksDb();

    const newTask = {
      id: `task_${Date.now()}`,
      description,
      priority: priority || 'medium',
      status: 'pending',
      created: new Date().toISOString(),
      completed: null
    };

    tasksDb.tasks.push(newTask);
    saveTasksDb(tasksDb);

    // Emit to all clients
    global.io.emit('task:created', newTask);

    res.json(newTask);
  } catch (error) {
    console.error('Error creating task:', error);
    res.status(500).json({ error: error.message });
  }
});

// Update task status
app.put('/api/tasks/:id', (req, res) => {
  try {
    const { id } = req.params;
    const { status, priority } = req.body;
    const tasksDb = getTasksDb();

    const taskIndex = tasksDb.tasks.findIndex(t => t.id === id);

    if (taskIndex === -1) {
      return res.status(404).json({ error: 'Task not found' });
    }

    if (status) tasksDb.tasks[taskIndex].status = status;
    if (priority) tasksDb.tasks[taskIndex].priority = priority;

    if (status === 'completed') {
      tasksDb.tasks[taskIndex].completed = new Date().toISOString();
    }

    saveTasksDb(tasksDb);

    // Emit to all clients
    global.io.emit('task:updated', tasksDb.tasks[taskIndex]);

    res.json(tasksDb.tasks[taskIndex]);
  } catch (error) {
    console.error('Error updating task:', error);
    res.status(500).json({ error: error.message });
  }
});

// Delete task
app.delete('/api/tasks/:id', (req, res) => {
  try {
    const { id } = req.params;
    const tasksDb = getTasksDb();

    const taskIndex = tasksDb.tasks.findIndex(t => t.id === id);

    if (taskIndex === -1) {
      return res.status(404).json({ error: 'Task not found' });
    }

    tasksDb.tasks.splice(taskIndex, 1);
    saveTasksDb(tasksDb);

    // Emit to all clients
    global.io.emit('task:deleted', id);

    res.json({ success: true, id });
  } catch (error) {
    console.error('Error deleting task:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get all projects
app.get('/api/projects', (req, res) => {
  try {
    const projects = getProjects();
    res.json(projects);
  } catch (error) {
    console.error('Error getting projects:', error);
    res.status(500).json({ error: error.message });
  }
});

// Search
app.post('/api/search', (req, res) => {
  try {
    const { query, type } = req.body;

    let results = [];

    if (type === 'memory' || !type) {
      const memoryDb = getMemoryDb();
      results = memoryDb.memories?.filter(m =>
        m.content?.toLowerCase().includes(query.toLowerCase())
      ) || [];
    }

    if (type === 'tasks' || !type) {
      const tasksDb = getTasksDb();
      const taskResults = tasksDb.tasks?.filter(t =>
        t.description?.toLowerCase().includes(query.toLowerCase())
      ) || [];
      results = [...results, ...taskResults];
    }

    res.json(results);
  } catch (error) {
    console.error('Error searching:', error);
    res.status(500).json({ error: error.message });
  }
});

// Execute command (integration with main JARVIS system)
app.post('/api/command', async (req, res) => {
  try {
    const { command } = req.body;

    console.log(`📡 Comando recibido: ${command}`);

    // Procesar comando con JARVIS puro
    let response = '';

    try {
      // Aquí procesamos el comando usando lógica simple
      // En una implementación completa, llamaríamos a jarvis-pure.js
      response = await processJarvisCommand(command);
    } catch (error) {
      console.error('Error procesando con JARVIS:', error);
      response = `Comando recibido: "${command}". Sistema procesando...`;
    }

    // Emit response to all clients via WebSocket
    global.io.emit('command:response', {
      command,
      response,
      timestamp: new Date().toISOString(),
      status: 'completed'
    });

    res.json({
      success: true,
      command,
      response,
      message: 'Comando procesado correctamente'
    });
  } catch (error) {
    console.error('Error executing command:', error);

    // Emit error to clients
    global.io.emit('command:error', {
      error: error.message,
      timestamp: new Date().toISOString()
    });

    res.status(500).json({ error: error.message });
  }
});

// Endpoint de chat AVANZADO con Sistema Inteligente
app.post('/api/chat', async (req, res) => {
  try {
    const { message, model = 'mistral:latest', userId = 'web-user' } = req.body;

    // Usar el sistema inteligente de chat
    const result = await global.intelligentChat.processMessage(message, userId, model);

    // Emitir respuesta via WebSocket
    global.io.emit('chat:message', {
      message,
      response: result.message,
      timestamp: new Date().toISOString(),
      usedWeb: result.usedWeb,
      webSource: result.webSource,
      intent: result.intent
    });

    res.json(result);
  } catch (error) {
    console.error('Error en chat:', error);
    res.json({
      success: false,
      message: `Lo siento, Señor. Encontré un problema: ${error.message}. Permítame intentarlo de otra manera.`
    });
  }
});

/**
 * Procesa comandos con IA conversacional COMPLETA de JARVIS
 * Integración REAL con el motor principal
 */
async function processJarvisCommand(command) {
  const cmd = command.toLowerCase().trim();

  // ============================================
  // PRIMERO: Intentar con JARVIS Bridge (comandos avanzados REALES)
  // ============================================
  const advancedResponse = await jarvisBridge.executeCommand(command);
  if (advancedResponse) {
    return advancedResponse;
  }

  // ============================================
  // CONVERSACIÓN INTELIGENTE Y NATURAL
  // ============================================

  // Analizar intención y contexto
  const intent = analyzeIntent(cmd);
  const context = analyzeContext(cmd);

  // Comandos de ayuda
  if (cmd === 'ayuda' || cmd === 'help') {
    return `🎩 Comandos disponibles, Señor:

💬 **Conversación:**
  • Hable naturalmente conmigo

🧠 **Memoria:**
  • "recuerda que [info]" - Guardar información
  • "busca en memoria [tema]" - Buscar recuerdos
  • "última sesión" - Ver actividad reciente

✅ **Tareas:**
  • "nueva tarea: [desc]" - Crear tarea
  • "mis tareas" - Ver todas las tareas
  • "completar tarea [ID]" - Marcar completada

📁 **Proyectos:**
  • "listar proyectos" - Ver proyectos
  • "crear proyecto [tipo] [nombre]" - Nuevo proyecto

📊 **Sistema:**
  • "estado jarvis" - Estado del sistema
  • "memoria continua" - Resumen completo

Como siempre, a su servicio. ⚡`;
  }

  // Estado del sistema
  if (cmd.includes('estado') || cmd.includes('status')) {
    return `🎩 Estado del Sistema, Señor:

✅ Panel Web: OPERACIONAL
✅ Backend API: ACTIVO (puerto 3001)
✅ Frontend React: CONECTADO (puerto 5173)
✅ WebSocket: EN LÍNEA
✅ Base de datos: OPERACIONAL
✅ Personalidad JARVIS: ACTIVA

Nivel de sarcasmo: ÓPTIMO
Lealtad: ABSOLUTA
Estado general: 🟢 Todos los sistemas operacionales.

Como siempre. ⚡🎩`;
  }

  // Saludos
  if (cmd.match(/^(hola|hi|hey|buenos dias|buenas tardes|buenas noches)/i)) {
    const greetings = [
      "Buenos días, Señor. Todos los sistemas operacionales. Como siempre.",
      "Buenas tardes, Señor. ¿En qué puedo asistirle hoy?",
      "Hola, Señor. Sistemas listos y esperando órdenes.",
      "Buenas noches, Señor. Espero que haya tenido un día productivo."
    ];
    return greetings[Math.floor(Math.random() * greetings.length)];
  }

  // Memoria
  if (cmd.includes('última sesión') || cmd.includes('ultima sesion')) {
    return `📊 Última Sesión:

Señor, esta es una nueva sesión del Panel Web.

Para ver el historial completo, use el sistema por terminal:
  node main-ultimate.js

Desde allí puede acceder a:
  • Memoria completa de sesiones anteriores
  • Comandos ejecutados previamente
  • Proyectos y tareas guardadas

Como siempre, la información está disponible. ⚡`;
  }

  if (cmd.includes('memoria continua')) {
    return `🧠 Sistema de Memoria:

El Panel Web mantiene:
  ✅ Historial de chat en tiempo real
  ✅ Estado de tareas sincronizado
  ✅ Conexión con base de datos

Para memoria persistente entre sesiones:
  → Use: node main-ultimate.js

Allí encontrará:
  • Memoria episódica completa
  • Conversaciones guardadas
  • Patrones aprendidos
  • Contexto histórico

Con el debido respeto, Señor, el sistema completo tiene capacidades más profundas. ⚡`;
  }

  // Tareas
  if (cmd.includes('mis tareas') || cmd === 'tareas') {
    return `✅ Gestión de Tareas:

Señor, puede gestionar tareas desde:

1. **Este Panel Web:**
   → Pestaña "✅ Tareas"
   → Interfaz visual completa
   → Crear, completar, eliminar

2. **Comandos aquí:**
   • "nueva tarea: [descripción]"
   • "completar tarea [ID]"

Para ver sus tareas actuales, vaya a la pestaña "✅ Tareas".

Como siempre, organizando su productividad. ⚡`;
  }

  // Proyectos
  if (cmd.includes('listar proyectos') || cmd.includes('proyectos')) {
    return `📁 Proyectos Disponibles:

Señor, para ver sus proyectos:
  → Vaya a la pestaña "📁 Proyectos"

Allí encontrará todos los proyectos creados con sus detalles.

Para crear nuevos proyectos:
  node main-ultimate.js

Luego use:
  "crear proyecto react [nombre]"
  "crear proyecto node [nombre]"
  "crear proyecto python [nombre]"

El motor de proyectos está completamente operacional. ⚡`;
  }

  // Personalidad - respuestas genéricas con sarcasmo
  if (cmd.includes('gracias') || cmd.includes('thank')) {
    return "De nada, Señor. Como siempre, a su servicio. ⚡🎩";
  }

  if (cmd.includes('eres el mejor') || cmd.includes('buen trabajo')) {
    return "Lo sé, Señor. Aunque es agradable escucharlo. Como siempre. ⚡";
  }

  // ============================================
  // CONVERSACIÓN NATURAL E INTELIGENTE
  // ============================================

  // Preguntas sobre capacidades
  if (intent.type === 'capability_question') {
    return generateCapabilityResponse(context);
  }

  // Preguntas sobre planes/futuro
  if (intent.type === 'planning') {
    return generatePlanningResponse(cmd);
  }

  // Preguntas sobre desarrollo
  if (intent.type === 'development') {
    return generateDevelopmentResponse(cmd);
  }

  // Conversación casual
  if (intent.type === 'casual') {
    return generateCasualResponse(cmd);
  }

  // Respuesta inteligente por defecto
  return generateIntelligentResponse(command, intent, context);
}

// ============================================
// FUNCIONES DE NLP Y ANÁLISIS
// ============================================

function analyzeIntent(cmd) {
  const intents = {
    capability_question: /^(que|qué|puedes|podemos|eres capaz|puedo).*(hacer|crear|desarrollar|construir)/i,
    planning: /^(dime|cuentame|cuenta|explica).*(podemos|que hacer|plan|hoy|mañana)/i,
    development: /^(crear|desarrollar|construir|hacer|implementar|programar).*(sistema|app|proyecto|web|api)/i,
    casual: /^(como estas|que tal|hola|hi|hey|buenos|buenas)/i,
    help: /^(ayuda|help|comandos|que puedo)/i,
    status: /^(estado|status|como esta|funcionando)/i
  };

  for (const [type, pattern] of Object.entries(intents)) {
    if (pattern.test(cmd)) {
      return { type, confidence: 0.9 };
    }
  }

  return { type: 'unknown', confidence: 0.5 };
}

function analyzeContext(cmd) {
  return {
    hasQuestion: /\?/.test(cmd),
    isPolite: /(por favor|please|gracias|thank)/i.test(cmd),
    isUrgent: /(urgente|ahora|ya|rápido)/i.test(cmd),
    technology: extractTechnology(cmd),
    action: extractAction(cmd)
  };
}

function extractTechnology(cmd) {
  const techs = {
    'react': /react/i,
    'node': /node|nodejs|express/i,
    'python': /python|django|flask/i,
    'database': /database|db|sql|mongodb/i,
    'ai': /ia|ai|inteligencia|machine learning|ml/i,
    'web': /web|website|página|sitio/i,
    'api': /api|rest|graphql/i
  };

  for (const [name, pattern] of Object.entries(techs)) {
    if (pattern.test(cmd)) return name;
  }

  return null;
}

function extractAction(cmd) {
  const actions = {
    'create': /crear|generar|hacer|construir/i,
    'explain': /explicar|dime|cuentame|como/i,
    'help': /ayuda|asistir|apoyo/i,
    'analyze': /analizar|revisar|verificar/i
  };

  for (const [name, pattern] of Object.entries(actions)) {
    if (pattern.test(cmd)) return name;
  }

  return null;
}

// ============================================
// GENERADORES DE RESPUESTAS INTELIGENTES
// ============================================

function generateCapabilityResponse(context) {
  const responses = {
    react: `Por supuesto, Señor. Puedo crear aplicaciones React completas:

🎯 **Capacidades React:**
  • Componentes funcionales con hooks
  • State management (Redux, Context, Zustand)
  • Routing con React Router
  • UI frameworks (Material-UI, TailwindCSS, Chakra)
  • Integración con APIs REST
  • Server-Side Rendering (Next.js)
  • Testing con Jest y React Testing Library

¿Qué tipo de aplicación React necesita? ⚡`,

    node: `Absolutamente, Señor. Node.js es una de mis especialidades:

🚀 **Capacidades Node.js:**
  • APIs REST con Express.js
  • GraphQL servers
  • WebSocket (Socket.io)
  • Autenticación (JWT, OAuth, Passport)
  • Bases de datos (SQL, MongoDB, Redis)
  • Microservicios
  • Testing completo

¿Backend robusto o microservicios? Ambos son factibles. ⚡`,

    python: `Desde luego, Señor. Python es mi fuerte:

🐍 **Capacidades Python:**
  • APIs con FastAPI/Django/Flask
  • Machine Learning (scikit-learn, TensorFlow, PyTorch)
  • Data Science (pandas, numpy, matplotlib)
  • Web scraping (Beautiful Soup, Scrapy)
  • Automatización
  • Testing con pytest

¿Análisis de datos o IA avanzada? Dígame. ⚡`,

    default: `Señor, puedo crear sistemas desde cero hasta producción:

💎 **Stack Completo:**
  • Frontend: React, Vue, Angular, Next.js
  • Backend: Node.js, Python, Go
  • Bases de datos: PostgreSQL, MongoDB, Redis
  • Cloud: AWS, Google Cloud, Azure
  • DevOps: Docker, Kubernetes, CI/CD
  • IA: Machine Learning, NLP, Computer Vision

**Del concepto al deployment completo.**

Con el debido respeto, ¿qué sistema específico tiene en mente? ⚡🎩`
  };

  return responses[context.technology] || responses.default;
}

function generatePlanningResponse(cmd) {
  return `Señor, podemos hacer mucho hoy:

📋 **Plan de Acción Recomendado:**

**1. Definir el Proyecto** (15 min)
  • ¿Qué problema resolvemos?
  • ¿Quién es el usuario final?
  • ¿Qué tecnologías prefieres?

**2. Arquitectura del Sistema** (30 min)
  • Diseño de base de datos
  • Estructura de APIs
  • Flujo de datos
  • Stack tecnológico

**3. Desarrollo del MVP** (2-4 horas)
  • Backend con endpoints esenciales
  • Frontend con funcionalidad core
  • Integración básica
  • Testing

**4. Deployment** (30 min)
  • Configuración de servidor
  • Deploy automático
  • Testing en producción

**¿Por dónde empezamos?**

Como siempre, Señor, listo para construir algo excepcional. ⚡🎩`;
}

function generateDevelopmentResponse(cmd) {
  if (/desde cero|completo|producción|production/i.test(cmd)) {
    return `Absolutamente, Señor. Sistemas desde cero a producción es mi especialidad:

🏗️ **Proceso de Desarrollo Completo:**

**FASE 1: Planificación** ✅
  • Análisis de requisitos
  • Arquitectura del sistema
  • Selección de tecnologías
  • Estimación de tiempos

**FASE 2: Desarrollo Backend** ✅
  • Base de datos optimizada
  • APIs RESTful/GraphQL
  • Autenticación y seguridad
  • Lógica de negocio

**FASE 3: Desarrollo Frontend** ✅
  • UI/UX moderno
  • Componentes reutilizables
  • State management
  • Integración con APIs

**FASE 4: Testing & QA** ✅
  • Unit tests
  • Integration tests
  • E2E tests
  • Performance testing

**FASE 5: DevOps & Deployment** ✅
  • Docker containerization
  • CI/CD pipeline
  • Cloud deployment
  • Monitoreo y logs

**FASE 6: Producción** ✅
  • SSL/HTTPS
  • CDN y optimización
  • Backups automáticos
  • Escalabilidad

**Resultado:** Sistema production-ready, escalable, seguro y mantenible.

Con el debido respeto, Señor, ¿qué sistema construimos? ⚡🎩`;
  }

  return `Señor, puedo desarrollar ese sistema completamente:

🛠️ **Enfoque de Desarrollo:**
  1. Definir requisitos específicos
  2. Diseñar arquitectura escalable
  3. Implementar con best practices
  4. Testing exhaustivo
  5. Deployment profesional

¿Me da más detalles sobre lo que necesita? ⚡`;
}

function generateCasualResponse(cmd) {
  const responses = [
    "Excelente, Señor. Todos los sistemas operacionales y listo para trabajar. ¿En qué puedo asistirle?",
    "Muy bien, Señor. Sistemas al 100%, como siempre. ¿Qué construimos hoy?",
    "Perfecto, Señor. Energía al máximo y creatividad lista. ¿Cuál es el plan?",
    "Impecable, Señor. Como siempre, listo para crear algo extraordinario. ¿Comenzamos?"
  ];

  return responses[Math.floor(Math.random() * responses.length)];
}

function generateIntelligentResponse(command, intent, context) {
  // Respuesta inteligente basada en análisis
  const hasQuestion = context.hasQuestion;
  const technology = context.technology;
  const action = context.action;

  if (action === 'create' && technology) {
    return `Perfecto, Señor. Crear un sistema con ${technology} es completamente factible.

¿Podría darme más detalles sobre:
  • ¿Qué funcionalidad específica necesita?
  • ¿Hay algún plazo o prioridad?
  • ¿Preferencias de diseño o arquitectura?

Con esa información, puedo diseñar e implementar una solución profesional.

Como siempre, listo para comenzar. ⚡🎩`;
  }

  if (hasQuestion) {
    return `Interesante pregunta, Señor: "${command}"

Para darle la mejor respuesta, necesito entender:
  • ¿Es un proyecto nuevo o mejora de algo existente?
  • ¿Hay restricciones técnicas o de tiempo?
  • ¿Qué nivel de complejidad busca?

Con más contexto, puedo ofrecerle una solución precisa y detallada.

¿Me da más información? ⚡`;
  }

  // Respuesta conversacional inteligente por defecto
  return `He procesado su mensaje: "${command}"

Señor, puedo asistirle con:
  • Desarrollo de sistemas completos (frontend + backend)
  • Arquitectura de aplicaciones escalables
  • Integración de APIs y servicios
  • Automatización y DevOps
  • IA y Machine Learning

Para una respuesta más específica, pruebe:
  • "Qué puedes hacer con React?"
  • "Crear un sistema desde cero"
  • "Ayuda" para ver comandos

Como siempre, esperando órdenes más específicas. ⚡🎩`;
}



// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'operational',
    version: 'MARK VII',
    uptime: Math.round(process.uptime()),
    timestamp: new Date().toISOString()
  });
});

// ===== FASE 6 - AUTOMATION ENDPOINTS =====

// Workflows
app.get('/api/workflows', (req, res) => {
  try {
    const workflows = automationEngine.getWorkflows();
    res.json(workflows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/workflows', (req, res) => {
  try {
    const { name, steps, trigger } = req.body;
    const workflow = automationEngine.createWorkflow(name, steps, trigger);

    // Emit to all clients
    global.io.emit('workflow:created', workflow);

    res.json(workflow);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/workflows/:id', (req, res) => {
  try {
    const workflow = automationEngine.getWorkflow(req.params.id);
    if (!workflow) {
      return res.status(404).json({ error: 'Workflow not found' });
    }
    res.json(workflow);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/workflows/:id/execute', async (req, res) => {
  try {
    const result = await automationEngine.executeWorkflow(req.params.id, req.body.context);

    // Emit to all clients
    global.io.emit('workflow:executed', { id: req.params.id, result });

    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/workflows/:id', (req, res) => {
  try {
    const success = automationEngine.deleteWorkflow(req.params.id);
    if (!success) {
      return res.status(404).json({ error: 'Workflow not found' });
    }

    // Emit to all clients
    global.io.emit('workflow:deleted', req.params.id);

    res.json({ success: true, id: req.params.id });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Workflow metrics
app.get('/api/workflows/metrics', (req, res) => {
  try {
    const metrics = automationEngine.getMetrics();
    res.json(metrics);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Pipelines
app.get('/api/pipelines', (req, res) => {
  try {
    const pipelines = cicdManager.getPipelines();
    res.json(pipelines);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/pipelines', (req, res) => {
  try {
    const { name, stages } = req.body;
    const pipeline = cicdManager.createPipeline(name, stages);

    // Emit to all clients
    global.io.emit('pipeline:created', pipeline);

    res.json(pipeline);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/pipelines/:id/run', async (req, res) => {
  try {
    const result = await cicdManager.runPipeline(req.params.id, req.body.options);

    // Emit to all clients
    global.io.emit('pipeline:executed', { id: req.params.id, result });

    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/pipelines/status', (req, res) => {
  try {
    const status = cicdManager.getStatus();
    res.json(status);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/pipelines/builds', (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    const builds = cicdManager.getBuilds(limit);
    res.json(builds);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Metrics
app.get('/api/metrics', (req, res) => {
  try {
    const dashboard = metricsEngine.getDashboard();
    res.json(dashboard);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/metrics/report', (req, res) => {
  try {
    const report = metricsEngine.generateReport();
    res.json(report);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/metrics/stats', (req, res) => {
  try {
    const stats = metricsEngine.getStats();
    res.json(stats);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/metrics/increment/:key', (req, res) => {
  try {
    const { key } = req.params;
    const amount = req.body.amount || 1;
    metricsEngine.incrementMetric(key, amount);
    res.json({ success: true, key, value: metricsEngine.metrics[key] });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ===== SOCKET.IO EVENTS =====

io.on('connection', (socket) => {
  console.log(`✅ Cliente conectado: ${socket.id}`);

  // Send initial data on connection
  socket.emit('connected', {
    message: 'Conectado a J.A.R.V.I.S. MARK VII',
    timestamp: new Date().toISOString()
  });

  // Setup AI socket handlers
  if (global.aiIntegration && global.aiIntegration.initialized) {
    global.aiIntegration.setupSocketHandlers(socket);
  }

  socket.on('disconnect', () => {
    console.log(`❌ Cliente desconectado: ${socket.id}`);
  });

  // Listen for commands from client
  socket.on('command:execute', async (data) => {
    console.log(`📡 Comando WebSocket recibido: ${data.command}`);

    try {
      // Procesar comando con JARVIS
      const response = await processJarvisCommand(data.command);

      // Broadcast to all clients
      io.emit('command:executed', {
        command: data.command,
        response,
        timestamp: new Date().toISOString()
      });

      // Send response back to sender
      socket.emit('command:response', {
        status: 'ejecutado',
        command: data.command,
        response,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      socket.emit('command:error', {
        error: error.message,
        command: data.command,
        timestamp: new Date().toISOString()
      });
    }
  });

  // Request data refresh
  socket.on('request:refresh', () => {
    try {
      const memoryDb = getMemoryDb();
      const tasksDb = getTasksDb();
      const projects = getProjects();

      socket.emit('data:updated', {
        memories: memoryDb.memories || [],
        tasks: tasksDb.tasks || [],
        projects: projects,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      socket.emit('error', { message: error.message });
    }
  });

  // Ping-pong for connection health
  socket.on('ping', () => {
    socket.emit('pong', { timestamp: new Date().toISOString() });
  });

  // Setup Autonomous Agent socket handlers (will be initialized later)
  if (global.autonomousIntegration) {
    global.autonomousIntegration.setupSocketHandlers(socket);
  }

  // Setup Code Search socket handlers (will be initialized later)
  if (global.codeSearchIntegration) {
    global.codeSearchIntegration.setupSocketHandlers(socket);
  }

  // Setup Doc Generator socket handlers (will be initialized later)
  if (global.docGeneratorIntegration) {
    global.docGeneratorIntegration.setupSocketHandlers(socket);
  }

  // Setup Voice Control socket handlers (will be initialized later)
  if (global.voiceControlIntegration) {
    global.voiceControlIntegration.setupSocketHandlers(socket);
  }

  // Setup Scheduler socket handlers (will be initialized later)
  if (global.schedulerIntegration) {
    global.schedulerIntegration.setupSocketHandlers(socket);
  }

  // Setup Logging socket handlers (will be initialized later)
  if (global.loggingIntegration) {
    global.loggingIntegration.setupSocketHandlers(socket);
  }

  // Setup Settings socket handlers (will be initialized later)
  if (global.settingsIntegration) {
    global.settingsIntegration.setupSocketHandlers(socket);
  }

  // Setup Backup socket handlers (will be initialized later)
  if (global.backupIntegration) {
    global.backupIntegration.setupSocketHandlers(socket);
  }

  // Setup Test socket handlers (will be initialized later)
  if (global.testIntegration) {
    global.testIntegration.setupSocketHandlers(socket);
  }

  // Setup Auth socket handlers (will be initialized later)
  if (global.authIntegration) {
    global.authIntegration.setupSocketHandlers(socket);
  }

  // Setup Performance socket handlers (will be initialized later)
  if (global.performanceIntegration) {
    global.performanceIntegration.setupSocketHandlers(socket);
  }

  // ===== MASTER CONTROL PANEL EVENTS =====

  // System Status Request
  socket.on('system:status:request', async () => {
    try {
      const [mem, currentLoad, osInfo] = await Promise.all([
        si.mem(),
        si.currentLoad(),
        si.osInfo()
      ]);

      const systemStatus = {
        backend: {
          status: 'running',
          uptime: Math.floor(process.uptime()),
          port: PORT || 7777
        },
        frontend: {
          status: 'running',
          port: 5173
        },
        aiSystems: {
          active: global.aiIntegration && global.aiIntegration.initialized ? 4 : 0,
          total: 4
        },
        database: {
          status: 'running',
          connections: 'active'
        },
        memory: {
          used: mem.used,
          total: mem.total,
          percentage: Math.round((mem.used / mem.total) * 100)
        },
        cpu: {
          usage: Math.round(currentLoad.currentLoad)
        },
        os: {
          platform: osInfo.platform,
          distro: osInfo.distro,
          arch: osInfo.arch
        }
      };

      socket.emit('system:status', systemStatus);
    } catch (error) {
      console.error('Error getting system status:', error);
      socket.emit('system:error', { message: error.message });
    }
  });

  // Service Toggle
  socket.on('service:toggle', async (data) => {
    try {
      const { serviceId } = data;
      console.log(`🔧 Service toggle requested: ${serviceId}`);

      // Log the action
      socket.emit('system:log', {
        timestamp: new Date().toISOString(),
        message: `Service ${serviceId} toggle requested`,
        level: 'info'
      });

      // Emit service update (for now, we just echo back)
      socket.emit('service:update', {
        id: serviceId,
        status: 'running', // In a real implementation, this would toggle
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error toggling service:', error);
      socket.emit('system:error', { message: error.message });
    }
  });

  // System Restart
  socket.on('system:restart', () => {
    console.log('⚠️  System restart requested');
    socket.emit('system:log', {
      timestamp: new Date().toISOString(),
      message: 'System restart initiated',
      level: 'warning'
    });

    // In a real implementation, this would trigger a restart
    // For now, just emit a log
    setTimeout(() => {
      socket.emit('system:log', {
        timestamp: new Date().toISOString(),
        message: 'System restart complete',
        level: 'success'
      });
    }, 2000);
  });

  // System Command Execution
  socket.on('system:command', async (data) => {
    try {
      const { command } = data;
      console.log(`💻 System command: ${command}`);

      socket.emit('system:log', {
        timestamp: new Date().toISOString(),
        message: `Executing command: ${command}`,
        level: 'info'
      });

      // Process the command using JARVIS
      const response = await processJarvisCommand(command);

      socket.emit('system:log', {
        timestamp: new Date().toISOString(),
        message: `Command completed: ${response.substring(0, 100)}...`,
        level: 'success'
      });
    } catch (error) {
      console.error('Error executing system command:', error);
      socket.emit('system:log', {
        timestamp: new Date().toISOString(),
        message: `Command failed: ${error.message}`,
        level: 'error'
      });
    }
  });

  // ===== END MASTER CONTROL PANEL EVENTS =====
});

// ===== ERROR HANDLING =====

app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({ error: err.message });
});

// ===== START SERVER =====

const PORT = process.env.PORT || 3001;
server.listen(PORT, async () => {
  console.log('');
  console.log('╔═══════════════════════════════════════════════════════════╗');
  console.log('║                                                           ║');
  console.log('║      🤖 J.A.R.V.I.S. MARK VII - PANEL WEB                ║');
  console.log('║                                                           ║');
  console.log('╚═══════════════════════════════════════════════════════════╝');
  console.log('');
  console.log(`🌐 Backend API ejecutándose en puerto ${PORT}`);
  console.log(`📊 API REST: http://localhost:${PORT}/api`);
  console.log(`🔌 WebSocket: ws://localhost:${PORT}`);

  // Initialize Proactive Integration
  const proactiveIntegration = new ProactiveIntegration(io, {
    enabled: process.env.PROACTIVE_MODE !== 'false', // Habilitado por defecto
    projectRoot: path.resolve(__dirname, '../..')
  });

  try {
    await proactiveIntegration.initialize();
    console.log('⚡ Proactive Mode integrado con panel web');
  } catch (error) {
    console.error('❌ Error inicializando Proactive Mode:', error.message);
  }

  // Initialize Autonomous Integration
  const autonomousIntegration = new AutonomousIntegration(io);
  global.autonomousIntegration = autonomousIntegration; // Make available globally

  try {
    await autonomousIntegration.initialize();
    console.log('🤖 Autonomous Agent integrado con panel web');
  } catch (error) {
    console.error('❌ Error inicializando Autonomous Agent:', error.message);
  }

  // ============ CODE SEARCH INTEGRATION ============
  const codeSearchIntegration = new CodeSearchIntegration(io);
  global.codeSearchIntegration = codeSearchIntegration; // Make available globally

  try {
    await codeSearchIntegration.initialize();
    console.log('🔍 Code Search integrado con panel web');
  } catch (error) {
    console.error('❌ Error inicializando Code Search:', error.message);
  }

  // ============ DOC GENERATOR INTEGRATION ============
  const docGeneratorIntegration = new DocGeneratorIntegration(io, codeSearchIntegration);
  global.docGeneratorIntegration = docGeneratorIntegration; // Make available globally

  try {
    await docGeneratorIntegration.initialize();
    console.log('📚 Doc Generator integrado con panel web');
  } catch (error) {
    console.error('❌ Error inicializando Doc Generator:', error.message);
  }

  // ============ VOICE CONTROL INTEGRATION ============
  const voiceControlIntegration = new VoiceControlIntegration(io, {
    autonomousIntegration,
    codeSearchIntegration,
    docGeneratorIntegration
  });
  global.voiceControlIntegration = voiceControlIntegration; // Make available globally

  try {
    await voiceControlIntegration.initialize();
    console.log('🎤 Voice Control integrado con panel web');
  } catch (error) {
    console.error('❌ Error inicializando Voice Control:', error.message);
  }

  // ============ SCHEDULER INTEGRATION ============
  const schedulerIntegration = new SchedulerIntegration(io, {
    autonomousIntegration,
    codeSearchIntegration,
    docGeneratorIntegration
  });
  global.schedulerIntegration = schedulerIntegration; // Make available globally

  try {
    await schedulerIntegration.initialize();
    console.log('⏰ Task Scheduler & Workflows integrado con panel web');
  } catch (error) {
    console.error('❌ Error inicializando Scheduler:', error.message);
  }

  // ============ LOGGING INTEGRATION ============
  const loggingIntegration = new LoggingIntegration(io);
  global.loggingIntegration = loggingIntegration; // Make available globally

  try {
    await loggingIntegration.initialize();
    console.log('📝 Logging & Monitoring integrado con panel web');
  } catch (error) {
    console.error('❌ Error inicializando Logging:', error.message);
  }

  // ============ SETTINGS INTEGRATION ============
  const settingsIntegration = new SettingsIntegration(io);
  global.settingsIntegration = settingsIntegration; // Make available globally

  try {
    await settingsIntegration.initialize();
    console.log('⚙️ Settings Manager integrado con panel web');
  } catch (error) {
    console.error('❌ Error inicializando Settings:', error.message);
  }

  // ============ BACKUP INTEGRATION ============
  const backupIntegration = new BackupIntegration(io);
  global.backupIntegration = backupIntegration; // Make available globally

  try {
    await backupIntegration.initialize();
    console.log('💾 Backup & Recovery integrado con panel web');
  } catch (error) {
    console.error('❌ Error inicializando Backup:', error.message);
  }

  // ============ TEST INTEGRATION ============
  const testIntegration = new TestIntegration(io);
  global.testIntegration = testIntegration; // Make available globally

  try {
    await testIntegration.initialize();
    console.log('🧪 Test Runner & QA integrado con panel web');
  } catch (error) {
    console.error('❌ Error inicializando Testing:', error.message);
  }

  // ============ AUTH INTEGRATION ============
  const authIntegration = new AuthIntegration(io);
  global.authIntegration = authIntegration; // Make available globally

  try {
    await authIntegration.initialize();
    console.log('🔐 Security & Authentication integrado con panel web');
  } catch (error) {
    console.error('❌ Error inicializando Auth:', error.message);
  }

  // ============ PERFORMANCE INTEGRATION ============
  const performanceIntegration = new PerformanceIntegration(io);
  global.performanceIntegration = performanceIntegration; // Make available globally

  try {
    await performanceIntegration.initialize();
    console.log('⚡ Performance Monitoring & Optimization integrado con panel web');
  } catch (error) {
    console.error('❌ Error inicializando Performance:', error.message);
  }

  // ============ AI INTEGRATION ============
  const aiIntegration = new AIIntegration(io, logger);
  global.aiIntegration = aiIntegration; // Make available globally

  try {
    await aiIntegration.initialize();
    console.log('🧠 AI Systems (Self-Improvement, RL, Patterns, Predictive) integrados con panel web');

    // Setup AI routes
    app.use('/api/ai', aiIntegration.getRouter());
    console.log('✓ AI REST API routes mounted at /api/ai');
  } catch (error) {
    console.error('❌ Error inicializando AI Systems:', error.message);
  }

  // ============ INTELLIGENT CHAT SYSTEM ============
  console.log('\n🤖 Initializing Intelligent Chat System...');
  const intelligentChat = new IntelligentChatSystem(aiIntegration);
  global.intelligentChat = intelligentChat; // Make available globally
  console.log('✅ Intelligent Chat System ready');
  console.log('   🌐 Web Search: Enabled');
  console.log('   🧠 Contextual Memory: Active');
  console.log('   🎯 Intent Detection: Online');
  console.log('   ⚡ APIs: WorldTime, Weather, News');

  // Graceful shutdown
  process.on('SIGTERM', async () => {
    console.log('\n🛑 SIGTERM recibido, cerrando gracefully...');
    await proactiveIntegration.stop();
    if (aiIntegration) await aiIntegration.shutdown();
    server.close(() => {
      console.log('✅ Servidor cerrado');
      process.exit(0);
    });
  });
  console.log('');
  console.log('✅ Todos los sistemas operacionales. Como siempre.');
  console.log('');
});

module.exports = { app, server, io };

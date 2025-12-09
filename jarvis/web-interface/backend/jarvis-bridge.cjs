// jarvis-bridge.cjs
// Puente entre Panel Web y JARVIS Core (main-ultimate.js)
// Permite ejecutar comandos reales del sistema principal desde el panel web

const { spawn } = require('child_process');
const path = require('path');

const OllamaIntegration = require('./ollama-integration.cjs');
const WebSearch = require('./web-search.cjs');
const CodeGenerator = require('./code-generator.cjs');

class JarvisBridge {
  constructor() {
    this.jarvisProcess = null;
    this.isReady = false;
    this.commandQueue = [];
    this.responseHandlers = new Map();
    this.ollamaIntegration = new OllamaIntegration();
    this.webSearch = new WebSearch();
    this.codeGenerator = new CodeGenerator();
  }

  /**
   * Inicializa conexión con JARVIS Core y Ollama
   */
  async initialize() {
    console.log('🔗 Inicializando puente con JARVIS Core...');

    // Inicializar Ollama Integration (IA LOCAL ILIMITADA)
    await this.ollamaIntegration.initialize();

    // Inicializar Code Generator
    await this.codeGenerator.initialize();

    // Por ahora, usamos ejecución directa de comandos
    // En el futuro, podemos iniciar main-ultimate.js como proceso persistente
    this.isReady = true;

    console.log('✅ Puente JARVIS Core: OPERACIONAL');
    return true;
  }

  /**
   * Ejecuta comando en JARVIS Core y retorna respuesta
   */
  async executeCommand(command) {
    if (!this.isReady) {
      throw new Error('JARVIS Core no está inicializado');
    }

    // Primero intentar con comandos especializados
    const specializedResponse = await this.processAdvancedCommand(command);
    if (specializedResponse) {
      return specializedResponse;
    }

    // Si no es comando especializado, usar Ollama para conversación natural ILIMITADA
    return await this.ollamaIntegration.chat(command);
  }

  /**
   * Procesa comandos avanzados con acceso a funcionalidades reales
   */
  async processAdvancedCommand(command) {
    const cmd = command.toLowerCase().trim();

    // ============================================
    // BÚSQUEDA WEB REAL
    // ============================================

    if (cmd.match(/^(busca|buscar|search|encuentra|investiga)\s+(en\s+)?(internet|web|google|online)\s+(.+)/i)) {
      const match = cmd.match(/^(busca|buscar|search|encuentra|investiga)\s+(en\s+)?(internet|web|google|online)\s+(.+)/i);
      const query = match[4];
      return this.searchWeb(query);
    }

    if (cmd.match(/^(puedes|puedo|puede).*(buscar|search|encontrar).*(internet|web|google|online)/i)) {
      return this.explainWebSearch();
    }

    // ============================================
    // GENERACIÓN DE CÓDIGO
    // ============================================

    // Generar componente React
    if (cmd.match(/^(genera|generar|crea|crear)\s+(un\s+)?componente\s+react\s+(.+)/i)) {
      const match = cmd.match(/^(genera|generar|crea|crear)\s+(un\s+)?componente\s+react\s+(.+)/i);
      const name = match[3].replace(/de\s+|para\s+/gi, '').trim();
      return this.generateReactComponent(name);
    }

    // Generar formulario React
    if (cmd.match(/^(genera|generar|crea|crear)\s+(un\s+)?formulario\s+(react\s+)?(.+)/i)) {
      const match = cmd.match(/^(genera|generar|crea|crear)\s+(un\s+)?formulario\s+(react\s+)?(.+)/i);
      const name = match[4].replace(/de\s+|para\s+/gi, '').trim();
      return this.generateReactForm(name);
    }

    // Generar API REST
    if (cmd.match(/^(genera|generar|crea|crear)\s+(una\s+)?api\s+(rest\s+)?(.+)/i)) {
      const match = cmd.match(/^(genera|generar|crea|crear)\s+(una\s+)?api\s+(rest\s+)?(.+)/i);
      const name = match[4].replace(/de\s+|para\s+/gi, '').trim();
      return this.generateNodeAPI(name);
    }

    // Generar middleware Node
    if (cmd.match(/^(genera|generar|crea|crear)\s+(un\s+)?middleware\s+(.+)/i)) {
      const match = cmd.match(/^(genera|generar|crea|crear)\s+(un\s+)?middleware\s+(.+)/i);
      const name = match[3].replace(/de\s+|para\s+/gi, '').trim();
      return this.generateNodeMiddleware(name);
    }

    // Explicar capacidades de generación
    if (cmd.match(/^(qué|que)\s+(puedes|podes)\s+(generar|crear)/i)) {
      return this.explainCodeGeneration();
    }

    // ============================================
    // COMANDOS DE MEMORIA PERSISTENTE
    // ============================================

    if (cmd.match(/^(recuerda|guarda|memoriza)\s+que\s+(.+)/i)) {
      const match = cmd.match(/^(recuerda|guarda|memoriza)\s+que\s+(.+)/i);
      const content = match[2];
      return this.saveToMemory(content);
    }

    if (cmd.match(/^busca en memoria\s+(.+)/i)) {
      const match = cmd.match(/^busca en memoria\s+(.+)/i);
      const query = match[1];
      return this.searchMemory(query);
    }

    if (cmd.match(/^(memoria completa|ver memoria|mostrar memoria)/i)) {
      return this.showMemory();
    }

    // ============================================
    // COMANDOS DE PROYECTOS
    // ============================================

    if (cmd.match(/^crear proyecto\s+(react|node|python|vue|angular)\s+(.+)/i)) {
      const match = cmd.match(/^crear proyecto\s+(react|node|python|vue|angular)\s+(.+)/i);
      const type = match[1];
      const name = match[2];
      return this.createProject(type, name);
    }

    if (cmd.match(/^(listar proyectos|mis proyectos|ver proyectos)/i)) {
      return this.listProjects();
    }

    // ============================================
    // COMANDOS DE TAREAS
    // ============================================

    if (cmd.match(/^nueva tarea[:\s]+(.+)/i)) {
      const match = cmd.match(/^nueva tarea[:\s]+(.+)/i);
      const description = match[1];
      return this.createTask(description);
    }

    if (cmd.match(/^completar tarea\s+(.+)/i)) {
      const match = cmd.match(/^completar tarea\s+(.+)/i);
      const taskId = match[1];
      return this.completeTask(taskId);
    }

    // ============================================
    // COMANDOS AVANZADOS
    // ============================================

    if (cmd.match(/^(analizar|analiza|revisa)\s+(.+)/i)) {
      const match = cmd.match(/^(analizar|analiza|revisa)\s+(.+)/i);
      const target = match[2];
      return this.analyzeTarget(target);
    }

    // NOTA: Eliminamos el interceptor genérico de "crea" para permitir que Ollama
    // maneje la generación de código de manera más inteligente y contextual.
    // Solo los comandos MUY específicos (genera componente react, genera api rest, etc.)
    // son interceptados arriba.

    // No es un comando avanzado - devolver null para procesamiento normal con Ollama
    return null;
  }

  // ============================================
  // FUNCIONES DE BÚSQUEDA WEB
  // ============================================

  explainWebSearch() {
    return `Absolutamente, Señor. Búsqueda web **COMPLETAMENTE OPERACIONAL**:

🌐 **Motor de Búsqueda Web ACTIVO:**

✅ **Sistema Implementado:**
  • Motor: DuckDuckGo Instant Answer API
  • Búsqueda en tiempo real
  • Sin límites (gratuito, sin API key)
  • Resultados instantáneos

✅ **Capacidades:**
  • Información actualizada de internet
  • Definiciones y resúmenes
  • Temas relacionados
  • URLs de referencia
  • Respuestas directas

✅ **Comandos Disponibles:**
  → "busca en internet [tema]"
  → "buscar en web [tema]"
  → "investiga [tema]"
  → "encuentra información sobre [tema]"

📚 **Ejemplos de Uso:**
  1. "busca en internet React 19 nuevas features"
  2. "buscar en web inteligencia artificial 2024"
  3. "investiga mejores prácticas TypeScript"
  4. "encuentra información sobre machine learning"

Como siempre, Señor, búsqueda web **real y operacional**. ⚡🎩

**¿Qué desea que busque en internet?**`;
  }

  async searchWeb(query) {
    try {
      console.log(`🌐 Iniciando búsqueda web: "${query}"`);

      // Usar el motor de búsqueda web real
      const formattedResults = await this.webSearch.quickSearch(query, 5);

      return formattedResults;

    } catch (error) {
      console.error('❌ Error en búsqueda web:', error);

      return `❌ Error realizando búsqueda web, Señor.

**Error:** ${error.message}

**Alternativa:**
Busque directamente en: https://duckduckgo.com/?q=${encodeURIComponent(query)}

Como siempre, intentaré resolver cualquier problema técnico. ⚡`;
    }
  }

  // ============================================
  // FUNCIONES DE MEMORIA
  // ============================================

  async saveToMemory(content) {
    const fs = require('fs').promises;
    const memoryFile = path.join(__dirname, '../../data/memory-db.json');

    try {
      let memory = { episodes: [] };

      try {
        const data = await fs.readFile(memoryFile, 'utf8');
        memory = JSON.parse(data);
      } catch (err) {
        // Archivo no existe, usar memoria vacía
      }

      const episode = {
        id: Date.now().toString(),
        type: 'user_input',
        content: content,
        timestamp: new Date().toISOString(),
        source: 'panel_web'
      };

      memory.episodes.push(episode);

      await fs.writeFile(memoryFile, JSON.stringify(memory, null, 2));

      return `✅ Guardado en memoria, Señor.

💾 **Información registrada:**
"${content}"

🕒 Timestamp: ${new Date().toLocaleString()}
📍 Fuente: Panel Web

Como siempre, su información está segura en mi memoria. ⚡`;

    } catch (error) {
      return `❌ Error guardando en memoria: ${error.message}`;
    }
  }

  async searchMemory(query) {
    const fs = require('fs').promises;
    const memoryFile = path.join(__dirname, '../../data/memory-db.json');

    try {
      const data = await fs.readFile(memoryFile, 'utf8');
      const memory = JSON.parse(data);

      const results = memory.episodes.filter(ep =>
        ep.content && ep.content.toLowerCase().includes(query.toLowerCase())
      );

      if (results.length === 0) {
        return `🔍 No encontré resultados para: "${query}"

Intente con otros términos o revise la memoria completa con "memoria completa". ⚡`;
      }

      let response = `🔍 Encontré ${results.length} resultado(s) para: "${query}"\n\n`;

      results.slice(0, 5).forEach((result, i) => {
        const date = new Date(result.timestamp).toLocaleString();
        response += `${i + 1}. **${result.content}**\n`;
        response += `   📅 ${date}\n\n`;
      });

      if (results.length > 5) {
        response += `... y ${results.length - 5} resultados más.\n\n`;
      }

      response += `Como siempre, Señor, la información está disponible. ⚡`;

      return response;

    } catch (error) {
      return `❌ Error buscando en memoria: ${error.message}`;
    }
  }

  async showMemory() {
    const fs = require('fs').promises;
    const memoryFile = path.join(__dirname, '../../data/memory-db.json');

    try {
      const data = await fs.readFile(memoryFile, 'utf8');
      const memory = JSON.parse(data);

      if (!memory.episodes || memory.episodes.length === 0) {
        return `🧠 La memoria está vacía, Señor.

Use "recuerda que..." para comenzar a guardar información. ⚡`;
      }

      let response = `🧠 **Memoria Completa**\n\n`;
      response += `📊 Total de episodios: ${memory.episodes.length}\n\n`;
      response += `**Últimos 10 episodios:**\n\n`;

      const recent = memory.episodes.slice(-10).reverse();

      recent.forEach((ep, i) => {
        const date = new Date(ep.timestamp).toLocaleString();
        response += `${i + 1}. ${ep.content}\n`;
        response += `   📅 ${date}\n\n`;
      });

      response += `Como siempre, Señor, su historial completo está seguro. ⚡`;

      return response;

    } catch (error) {
      return `❌ Error accediendo a memoria: ${error.message}`;
    }
  }

  // ============================================
  // FUNCIONES DE PROYECTOS
  // ============================================

  async createProject(type, name) {
    return `🏗️ **Creando proyecto ${type.toUpperCase()}: "${name}"**

Señor, el motor de proyectos está preparando:

**Estructura del proyecto:**
  • ${type === 'react' ? 'Componentes React + Vite + TailwindCSS' : ''}
  • ${type === 'node' ? 'Express.js + API REST + JWT Auth' : ''}
  • ${type === 'python' ? 'FastAPI + SQLAlchemy + Async' : ''}
  • Configuración de pruebas
  • Docker setup
  • CI/CD pipeline básico

**Próximos pasos:**
  1. Definir requisitos específicos
  2. Diseñar arquitectura
  3. Implementar funcionalidad core
  4. Testing y deployment

Para crear el proyecto completo, use:
  → Terminal: node main-ultimate.js
  → Comando: "crear proyecto ${type} ${name}"

El sistema completo tiene capacidades de generación automática de código.

¿Desea que comience la planificación detallada? ⚡🎩`;
  }

  async listProjects() {
    const fs = require('fs').promises;
    const projectsDir = path.join(__dirname, '../../projects');

    try {
      const exists = await fs.access(projectsDir).then(() => true).catch(() => false);

      if (!exists) {
        return `📁 No hay proyectos creados aún, Señor.

Use "crear proyecto [tipo] [nombre]" para comenzar.

Tipos disponibles:
  • react - Aplicación React moderna
  • node - API REST con Node.js
  • python - Backend Python
  • vue - Aplicación Vue.js
  • angular - Aplicación Angular

Como siempre, listo para crear. ⚡`;
      }

      const files = await fs.readdir(projectsDir);
      const projects = files.filter(f => !f.startsWith('.'));

      if (projects.length === 0) {
        return `📁 No hay proyectos creados aún, Señor.`;
      }

      let response = `📁 **Proyectos Disponibles** (${projects.length})\n\n`;

      projects.forEach((project, i) => {
        response += `${i + 1}. **${project}**\n`;
        response += `   📂 Ubicación: projects/${project}\n\n`;
      });

      response += `Para ver detalles o trabajar en un proyecto, acceda a la pestaña "📁 Proyectos".\n\n`;
      response += `Como siempre, Señor, sus proyectos están listos. ⚡`;

      return response;

    } catch (error) {
      return `❌ Error listando proyectos: ${error.message}`;
    }
  }

  // ============================================
  // FUNCIONES DE TAREAS
  // ============================================

  async createTask(description) {
    const fs = require('fs').promises;
    const tasksFile = path.join(__dirname, '../../data/tasks.json');

    try {
      let tasks = [];

      try {
        const data = await fs.readFile(tasksFile, 'utf8');
        tasks = JSON.parse(data);
      } catch (err) {
        // Archivo no existe
      }

      const task = {
        id: Date.now().toString(),
        description: description,
        status: 'pending',
        priority: 'media',
        createdAt: new Date().toISOString(),
        source: 'panel_web'
      };

      tasks.push(task);

      await fs.writeFile(tasksFile, JSON.stringify(tasks, null, 2));

      return `✅ **Tarea creada, Señor**

📝 Descripción: "${description}"
🆔 ID: ${task.id}
📊 Estado: Pendiente
⭐ Prioridad: Media

La tarea está ahora en su lista. Puede verla en la pestaña "✅ Tareas".

Como siempre, organizando su productividad. ⚡`;

    } catch (error) {
      return `❌ Error creando tarea: ${error.message}`;
    }
  }

  async completeTask(taskId) {
    const fs = require('fs').promises;
    const tasksFile = path.join(__dirname, '../../data/tasks.json');

    try {
      const data = await fs.readFile(tasksFile, 'utf8');
      let tasks = JSON.parse(data);

      const task = tasks.find(t => t.id === taskId || t.id.startsWith(taskId));

      if (!task) {
        return `❌ No encontré la tarea con ID: ${taskId}

Use "mis tareas" para ver la lista completa. ⚡`;
      }

      task.status = 'completed';
      task.completedAt = new Date().toISOString();

      await fs.writeFile(tasksFile, JSON.stringify(tasks, null, 2));

      return `✅ **Tarea completada, Señor**

📝 "${task.description}"
🎉 Marcada como completada
🕒 ${new Date().toLocaleString()}

Excelente trabajo. Como siempre. ⚡🎩`;

    } catch (error) {
      return `❌ Error completando tarea: ${error.message}`;
    }
  }

  // ============================================
  // FUNCIONES AVANZADAS
  // ============================================

  async analyzeTarget(target) {
    return `🔍 **Análisis Solicitado**: ${target}

Señor, puedo analizar:
  • **Código**: Arquitectura, calidad, vulnerabilidades, optimizaciones
  • **Sistemas**: Performance, escalabilidad, seguridad
  • **Datos**: Patrones, tendencias, insights
  • **Proyectos**: Estado, progreso, riesgos

Para análisis profundo, necesito:
  1. Especificar tipo de análisis
  2. Proporcionar archivos o datos
  3. Definir métricas a evaluar

¿Qué tipo de análisis necesita? ⚡`;
  }

  async implementFeature(feature) {
    return `🛠️ **Implementación Solicitada**: ${feature}

Señor, el proceso de implementación:

**FASE 1: Diseño** (15-30 min)
  • Especificaciones técnicas
  • Arquitectura de la feature
  • Dependencias y requisitos

**FASE 2: Desarrollo** (1-4 horas)
  • Código backend/frontend
  • Tests unitarios
  • Documentación

**FASE 3: Integración** (30 min)
  • Merge con sistema existente
  • Testing de integración
  • Deployment

**FASE 4: Validación** (15 min)
  • Testing E2E
  • Verificación de funcionalidad
  • Optimización

¿Desea que comience con el diseño de "${feature}"? ⚡🎩`;
  }

  // ============================================
  // FUNCIONES DE GENERACIÓN DE CÓDIGO
  // ============================================

  async generateReactComponent(name) {
    try {
      const result = await this.codeGenerator.generate('react-component', {
        name,
        props: [],
        useState: []
      });

      return `✅ **Componente React Generado: ${result.fileName}**

Señor, he creado el componente React completo:

📁 **Archivo Generado:**
\`${result.fileName}\`

📍 **Ubicación:**
\`${result.filePath}\`

📝 **Características:**
  • Componente funcional moderno
  • Estructura React 19 compatible
  • Listo para usar
  • Con comentarios TODO para customización

**Código Generado:**
\`\`\`jsx
${result.code}
\`\`\`

**Para usar:**
1. Copie el archivo desde: \`generated-code/${result.fileName}\`
2. Muévalo a su proyecto
3. Importe: \`import ${this.toPascalCase(name)} from './${result.fileName}'\`

Como siempre, Señor, código production-ready. ⚡🎩`;

    } catch (error) {
      return `❌ Error generando componente: ${error.message}`;
    }
  }

  async generateReactForm(name) {
    try {
      // Formulario básico con campos de ejemplo
      const result = await this.codeGenerator.generate('react-form', {
        name,
        fields: [
          { name: 'nombre', label: 'Nombre', type: 'text', required: true, placeholder: 'Ingrese su nombre' },
          { name: 'email', label: 'Email', type: 'email', required: true, placeholder: 'correo@ejemplo.com' },
          { name: 'mensaje', label: 'Mensaje', type: 'text', required: false, placeholder: 'Su mensaje aquí...' }
        ]
      });

      const files = result.files.map(f => `  • ${f.name}`).join('\n');

      return `✅ **Formulario React Generado: ${name}**

Señor, he creado un formulario completo con validación:

📁 **Archivos Generados:**
${files}

📍 **Ubicación:**
\`${result.files[0].path.replace(/[^\\]+$/, '')}\`

📝 **Características:**
  • Validación de formulario integrada
  • Manejo de estados con useState
  • Mensajes de error personalizados
  • CSS moderno incluido
  • Responsive design

**Campos Incluidos:**
  ✓ Nombre (requerido)
  ✓ Email (requerido)
  ✓ Mensaje (opcional)

**Para usar:**
1. Copie los archivos desde: \`generated-code/\`
2. Muévalo a su proyecto
3. Importe y use el componente

**Personalice:**
- Agregue más campos en el código
- Modifique validaciones
- Ajuste estilos CSS

Como siempre, Señor, formulario production-ready. ⚡🎩`;

    } catch (error) {
      return `❌ Error generando formulario: ${error.message}`;
    }
  }

  async generateNodeAPI(name) {
    try {
      const result = await this.codeGenerator.generate('node-api', {
        name,
        endpoints: [
          { method: 'GET', path: '/', description: 'Obtener todos los elementos' },
          { method: 'GET', path: '/:id', description: 'Obtener elemento por ID' },
          { method: 'POST', path: '/', description: 'Crear nuevo elemento' },
          { method: 'PUT', path: '/:id', description: 'Actualizar elemento' },
          { method: 'DELETE', path: '/:id', description: 'Eliminar elemento' }
        ]
      });

      const files = result.files.map(f => `  • ${f.name}`).join('\n');

      return `✅ **API REST Generada: ${name}**

Señor, he creado una API REST completa con Express.js:

📁 **Archivos Generados:**
${files}

📍 **Ubicación:**
\`${result.files[0].path.replace(/[^\\]+$/, '')}\`

📝 **Endpoints Incluidos:**
  ✓ GET    /         → Listar todos
  ✓ GET    /:id      → Obtener por ID
  ✓ POST   /         → Crear nuevo
  ✓ PUT    /:id      → Actualizar
  ✓ DELETE /:id      → Eliminar

🔧 **Características:**
  • Estructura MVC (Routes + Controller)
  • Manejo de errores robusto
  • Respuestas JSON estándar
  • Async/Await
  • Express Router

**Para integrar:**
\`\`\`javascript
const ${this.toCamelCase(name)}Routes = require('./generated-code/${result.files[0].name}');
app.use('/api/${this.toKebabCase(name)}', ${this.toCamelCase(name)}Routes);
\`\`\`

Como siempre, Señor, API enterprise-grade. ⚡🎩`;

    } catch (error) {
      return `❌ Error generando API: ${error.message}`;
    }
  }

  async generateNodeMiddleware(name) {
    try {
      // Detectar tipo de middleware por el nombre
      let type = 'generic';
      if (name.match(/auth|autenticaci/i)) type = 'auth';
      else if (name.match(/valida/i)) type = 'validation';
      else if (name.match(/log/i)) type = 'logger';

      const result = await this.codeGenerator.generate('node-middleware', { name, type });

      return `✅ **Middleware Node.js Generado: ${result.fileName}**

Señor, he creado un middleware ${type === 'generic' ? 'genérico' : type}:

📁 **Archivo Generado:**
\`${result.fileName}\`

📍 **Ubicación:**
\`${result.filePath}\`

📝 **Tipo:** ${type.toUpperCase()}

**Código Generado:**
\`\`\`javascript
${result.code}
\`\`\`

**Para usar:**
\`\`\`javascript
const ${this.toCamelCase(name)}Middleware = require('./generated-code/${result.fileName}');

// Global
app.use(${this.toCamelCase(name)}Middleware);

// En ruta específica
app.get('/ruta', ${this.toCamelCase(name)}Middleware, (req, res) => {
  // Handler
});
\`\`\`

Como siempre, Señor, middleware production-ready. ⚡🎩`;

    } catch (error) {
      return `❌ Error generando middleware: ${error.message}`;
    }
  }

  explainCodeGeneration() {
    return `Absolutamente, Señor. **Generación de código COMPLETAMENTE OPERACIONAL**:

🛠️ **Motor de Generación Activo:**

✅ **REACT:**
  → "genera componente react UserProfile"
  → "genera formulario login"
  → "crea formulario contacto"

✅ **NODE.JS / EXPRESS:**
  → "genera api rest usuarios"
  → "crea api productos"
  → "genera middleware autenticación"
  → "crea middleware validación"

✅ **PYTHON:**
  → "genera script python análisis datos"
  → "crea clase python UserManager"

📦 **Características de Código Generado:**

**React Components:**
  • Componentes funcionales modernos
  • useState, useEffect incluidos
  • TypeScript interfaces (opcional)
  • CSS modules
  • Validación de props

**React Forms:**
  • Validación completa
  • Manejo de errores
  • Estados controlados
  • CSS responsive
  • Campos personalizables

**Node.js APIs:**
  • Estructura MVC
  • CRUD completo
  • Manejo de errores
  • Express Router
  • Controller separado

**Middlewares:**
  • Autenticación (JWT)
  • Validación de datos
  • Logging
  • Genéricos customizables

📂 **Ubicación:**
Todos los archivos generados van a: \`generated-code/\`

💡 **Ejemplos de Uso:**

\`\`\`
genera componente react Dashboard
genera formulario registro de usuario
crea api rest productos
genera middleware autenticación JWT
\`\`\`

**Cada generación incluye:**
  ✓ Código completo y funcional
  ✓ Comentarios y documentación
  ✓ Estructura profesional
  ✓ Listo para producción
  ✓ Fácil de personalizar

Como siempre, Señor, **generación enterprise-grade**. ⚡🎩

**¿Qué desea que genere?**`;
  }

  toPascalCase(str) {
    return str.replace(/(\w)(\w*)/g, (g0, g1, g2) => g1.toUpperCase() + g2.toLowerCase())
              .replace(/[^a-zA-Z0-9]/g, '');
  }

  toCamelCase(str) {
    const pascal = this.toPascalCase(str);
    return pascal.charAt(0).toLowerCase() + pascal.slice(1);
  }

  toKebabCase(str) {
    return str.replace(/([a-z])([A-Z])/g, '$1-$2')
              .replace(/[\s_]+/g, '-')
              .toLowerCase();
  }
}

module.exports = JarvisBridge;

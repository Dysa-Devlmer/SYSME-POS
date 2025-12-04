// core/autonomous-agent/task-planner.cjs
// Task Planner - JARVIS descompone tareas complejas en pasos ejecutables

const axios = require('axios');
const { EventEmitter } = require('events');

/**
 * Task Planner
 *
 * Capacidades:
 * - Analiza tareas complejas
 * - Las descompone en sub-tareas ejecutables
 * - Identifica dependencias
 * - Genera plan de ejecución óptimo
 * - Estima tiempo y complejidad
 */
class TaskPlanner extends EventEmitter {
  constructor(options = {}) {
    super();

    this.ollamaUrl = options.ollamaUrl || 'http://localhost:11434';
    this.model = options.model || 'qwen2.5-coder:latest';
    this.timeout = options.timeout || 90000;
  }

  /**
   * Planea una tarea compleja
   */
  async planTask(taskDescription, context = {}) {
    console.log(`\n🎯 [Task Planner] Analizando tarea: "${taskDescription}"\n`);
    this.emit('plan:start', { taskDescription });

    try {
      // 1. Analizar la tarea
      const analysis = await this.analyzeTask(taskDescription, context);

      // 2. Generar sub-tareas
      const subtasks = await this.generateSubtasks(taskDescription, analysis, context);

      // 3. Identificar dependencias
      const dependencies = this.identifyDependencies(subtasks);

      // 4. Ordenar sub-tareas
      const orderedSubtasks = this.orderSubtasks(subtasks, dependencies);

      // 5. Estimar complejidad y tiempo
      const estimation = this.estimateComplexity(orderedSubtasks);

      const plan = {
        taskDescription,
        analysis,
        subtasks: orderedSubtasks,
        dependencies,
        estimation,
        timestamp: Date.now()
      };

      console.log(`✅ [Task Planner] Plan generado: ${orderedSubtasks.length} sub-tareas\n`);
      this.emit('plan:complete', { plan });

      return plan;

    } catch (error) {
      console.error(`❌ [Task Planner] Error: ${error.message}`);
      this.emit('plan:error', { taskDescription, error: error.message });
      throw error;
    }
  }

  /**
   * Analiza la tarea para entenderla
   */
  async analyzeTask(taskDescription, context) {
    const prompt = `Analiza esta tarea de desarrollo de software:

Tarea: ${taskDescription}

Contexto adicional:
${JSON.stringify(context, null, 2)}

Proporciona un análisis estructurado en formato JSON:
{
  "type": "tipo de tarea (backend, frontend, fullstack, infra, etc)",
  "complexity": "low/medium/high/expert",
  "mainGoal": "objetivo principal en una frase",
  "keyRequirements": ["req1", "req2", "req3"],
  "technologiesSuggested": ["tech1", "tech2"],
  "potentialChallenges": ["challenge1", "challenge2"],
  "estimatedSteps": 5
}`;

    try {
      const response = await this.callOllama(prompt);
      return this.parseJSON(response) || {
        type: 'unknown',
        complexity: 'medium',
        mainGoal: taskDescription,
        keyRequirements: [],
        technologiesSuggested: [],
        potentialChallenges: [],
        estimatedSteps: 5
      };
    } catch (error) {
      console.error('❌ Error en análisis:', error.message);
      return {
        type: 'unknown',
        complexity: 'medium',
        mainGoal: taskDescription,
        keyRequirements: [],
        technologiesSuggested: [],
        potentialChallenges: [],
        estimatedSteps: 5
      };
    }
  }

  /**
   * Genera sub-tareas ejecutables
   */
  async generateSubtasks(taskDescription, analysis, context) {
    const prompt = `Descompón esta tarea en sub-tareas específicas y ejecutables:

Tarea Principal: ${taskDescription}

Análisis:
- Tipo: ${analysis.type}
- Complejidad: ${analysis.complexity}
- Objetivo: ${analysis.mainGoal}
- Tecnologías: ${analysis.technologiesSuggested.join(', ')}

Genera una lista de sub-tareas en formato JSON:
[
  {
    "id": "subtask-1",
    "title": "Título claro de la sub-tarea",
    "description": "Descripción detallada de qué hacer",
    "type": "research/code/test/document/deploy",
    "complexity": "low/medium/high",
    "estimatedTime": "tiempo en minutos",
    "prerequisites": ["id de otras subtareas necesarias"],
    "deliverables": ["qué debe producir esta tarea"],
    "verificationCriteria": ["cómo verificar que está completa"]
  }
]

IMPORTANTE:
- Cada sub-tarea debe ser específica y ejecutable
- Incluir investigación cuando sea necesario
- Incluir tests y documentación
- Máximo 15 sub-tareas`;

    try {
      const response = await this.callOllama(prompt);
      const subtasks = this.parseJSON(response);

      if (Array.isArray(subtasks) && subtasks.length > 0) {
        // Asegurar IDs únicos
        return subtasks.map((task, i) => ({
          id: task.id || `subtask-${i + 1}`,
          title: task.title || `Sub-tarea ${i + 1}`,
          description: task.description || '',
          type: task.type || 'code',
          complexity: task.complexity || 'medium',
          estimatedTime: task.estimatedTime || 30,
          prerequisites: task.prerequisites || [],
          deliverables: task.deliverables || [],
          verificationCriteria: task.verificationCriteria || [],
          status: 'pending'
        }));
      }

      // Fallback: generar sub-tareas básicas
      return this.generateBasicSubtasks(taskDescription, analysis);

    } catch (error) {
      console.error('❌ Error generando sub-tareas:', error.message);
      return this.generateBasicSubtasks(taskDescription, analysis);
    }
  }

  /**
   * Genera sub-tareas básicas (fallback)
   */
  generateBasicSubtasks(taskDescription, analysis) {
    const steps = Math.min(analysis.estimatedSteps || 5, 10);
    const subtasks = [];

    // 1. Research (si es necesario)
    if (analysis.complexity !== 'low') {
      subtasks.push({
        id: 'subtask-research',
        title: 'Investigar mejores prácticas y soluciones',
        description: `Buscar información sobre: ${taskDescription}`,
        type: 'research',
        complexity: 'low',
        estimatedTime: 15,
        prerequisites: [],
        deliverables: ['Conocimiento adquirido', 'Patrones identificados'],
        verificationCriteria: ['Información guardada en memoria'],
        status: 'pending'
      });
    }

    // 2. Planning
    subtasks.push({
      id: 'subtask-planning',
      title: 'Diseñar arquitectura y estructura',
      description: 'Diseñar la estructura del código y componentes necesarios',
      type: 'code',
      complexity: 'medium',
      estimatedTime: 20,
      prerequisites: analysis.complexity !== 'low' ? ['subtask-research'] : [],
      deliverables: ['Estructura definida', 'Componentes identificados'],
      verificationCriteria: ['Arquitectura clara'],
      status: 'pending'
    });

    // 3. Implementation
    for (let i = 0; i < Math.min(steps - 2, 5); i++) {
      subtasks.push({
        id: `subtask-impl-${i + 1}`,
        title: `Implementar componente/funcionalidad ${i + 1}`,
        description: `Desarrollar parte ${i + 1} de la solución`,
        type: 'code',
        complexity: 'medium',
        estimatedTime: 30,
        prerequisites: i === 0 ? ['subtask-planning'] : [`subtask-impl-${i}`],
        deliverables: ['Código funcional'],
        verificationCriteria: ['Código sin errores'],
        status: 'pending'
      });
    }

    // 4. Testing
    subtasks.push({
      id: 'subtask-testing',
      title: 'Crear tests y verificar funcionamiento',
      description: 'Escribir tests y verificar que todo funciona correctamente',
      type: 'test',
      complexity: 'medium',
      estimatedTime: 25,
      prerequisites: subtasks.filter(t => t.type === 'code').map(t => t.id),
      deliverables: ['Tests completos', 'Cobertura adecuada'],
      verificationCriteria: ['Tests pasando'],
      status: 'pending'
    });

    // 5. Documentation
    subtasks.push({
      id: 'subtask-documentation',
      title: 'Documentar solución',
      description: 'Crear documentación clara de lo implementado',
      type: 'document',
      complexity: 'low',
      estimatedTime: 15,
      prerequisites: ['subtask-testing'],
      deliverables: ['README', 'Comentarios en código'],
      verificationCriteria: ['Documentación completa'],
      status: 'pending'
    });

    return subtasks;
  }

  /**
   * Identifica dependencias entre sub-tareas
   */
  identifyDependencies(subtasks) {
    const dependencies = {};

    subtasks.forEach(task => {
      dependencies[task.id] = {
        depends_on: task.prerequisites || [],
        blocks: []
      };
    });

    // Calcular qué tareas bloquea cada una
    subtasks.forEach(task => {
      (task.prerequisites || []).forEach(prereqId => {
        if (dependencies[prereqId]) {
          dependencies[prereqId].blocks.push(task.id);
        }
      });
    });

    return dependencies;
  }

  /**
   * Ordena sub-tareas respetando dependencias (topological sort)
   */
  orderSubtasks(subtasks, dependencies) {
    const ordered = [];
    const visited = new Set();
    const temp = new Set();

    const visit = (taskId) => {
      if (temp.has(taskId)) {
        throw new Error(`Dependencia circular detectada: ${taskId}`);
      }
      if (visited.has(taskId)) return;

      temp.add(taskId);

      const task = subtasks.find(t => t.id === taskId);
      if (task && task.prerequisites) {
        task.prerequisites.forEach(prereq => visit(prereq));
      }

      temp.delete(taskId);
      visited.add(taskId);
      if (task) ordered.push(task);
    };

    try {
      subtasks.forEach(task => {
        if (!visited.has(task.id)) {
          visit(task.id);
        }
      });
      return ordered;
    } catch (error) {
      console.warn('⚠️ Dependencia circular detectada, usando orden original');
      return subtasks;
    }
  }

  /**
   * Estima complejidad y tiempo total
   */
  estimateComplexity(subtasks) {
    const totalTime = subtasks.reduce((sum, task) => {
      const time = typeof task.estimatedTime === 'number' ? task.estimatedTime : 30;
      return sum + time;
    }, 0);

    const complexityScore = subtasks.reduce((sum, task) => {
      const score = { low: 1, medium: 2, high: 3, expert: 4 }[task.complexity] || 2;
      return sum + score;
    }, 0);

    const avgComplexity = complexityScore / subtasks.length;

    let overallComplexity;
    if (avgComplexity < 1.5) overallComplexity = 'low';
    else if (avgComplexity < 2.5) overallComplexity = 'medium';
    else if (avgComplexity < 3.5) overallComplexity = 'high';
    else overallComplexity = 'expert';

    return {
      totalSubtasks: subtasks.length,
      estimatedTimeMinutes: totalTime,
      estimatedTimeHours: (totalTime / 60).toFixed(1),
      overallComplexity,
      parallelizable: subtasks.filter(t => !t.prerequisites || t.prerequisites.length === 0).length,
      requiresResearch: subtasks.some(t => t.type === 'research')
    };
  }

  /**
   * Llama a Ollama
   */
  async callOllama(prompt) {
    const response = await axios.post(
      `${this.ollamaUrl}/api/generate`,
      {
        model: this.model,
        prompt: prompt,
        stream: false,
        options: {
          temperature: 0.3,
          num_predict: 2000
        }
      },
      { timeout: this.timeout }
    );

    return response.data.response;
  }

  /**
   * Parsea JSON de respuesta
   */
  parseJSON(text) {
    try {
      // Intentar parsear directo
      return JSON.parse(text);
    } catch (e) {
      // Buscar JSON en el texto
      const jsonMatch = text.match(/\{[\s\S]*\}|\[[\s\S]*\]/);
      if (jsonMatch) {
        try {
          return JSON.parse(jsonMatch[0]);
        } catch (e2) {
          return null;
        }
      }
      return null;
    }
  }
}

module.exports = TaskPlanner;

/**
 * JARVIS Mark VII v2.1.0 - Core Integration
 * Integración de todos los módulos del núcleo
 *
 * @module JARVISCore
 * @version 2.1.0
 */

const MemoryManager = require('./neural-memory/memory-manager.cjs');
const NLPEngine = require('./nlp-engine');
const DecisionEngine = require('./decision-engine');
const ReasoningEngine = require('./reasoning-engine');
const AutonomousAgentManager = require('./autonomous-agent/autonomous-agent-manager.cjs');

class JARVISCore {
  constructor(config = {}) {
    this.config = {
      enableMemory: config.enableMemory !== false,
      enableNLP: config.enableNLP !== false,
      enableDecision: config.enableDecision !== false,
      enableReasoning: config.enableReasoning !== false,
      enableAutonomous: config.enableAutonomous !== false,
      ...config
    };

    // Componentes principales
    this.memory = null;
    this.nlp = null;
    this.decision = null;
    this.reasoning = null;
    this.autonomous = null;

    this.initialized = false;
  }

  /**
   * Inicializa todos los componentes
   */
  async initialize() {
    try {
      console.log('');
      console.log('╔════════════════════════════════════════════════╗');
      console.log('║   🤖 JARVIS Mark VII v2.1.0 - Core System    ║');
      console.log('╠════════════════════════════════════════════════╣');

      // 1. Memory Manager
      if (this.config.enableMemory) {
        this.memory = new MemoryManager(this.config.memory);
        await this.memory.initialize();
        console.log('║   ✅ Memory Manager: Operativo                ║');
      }

      // 2. NLP Engine
      if (this.config.enableNLP) {
        this.nlp = new NLPEngine(this.config.nlp);
        console.log('║   ✅ NLP Engine: Operativo                    ║');
      }

      // 3. Decision Engine
      if (this.config.enableDecision) {
        this.decision = new DecisionEngine(this.memory);
        console.log('║   ✅ Decision Engine: Operativo               ║');
      }

      // 4. Reasoning Engine
      if (this.config.enableReasoning) {
        this.reasoning = new ReasoningEngine();
        console.log('║   ✅ Reasoning Engine: Operativo              ║');
      }

      // 5. Autonomous Agent
      if (this.config.enableAutonomous) {
        this.autonomous = new AutonomousAgentManager(this.config.autonomous);
        await this.autonomous.initialize();
        console.log('║   ✅ Autonomous Agent: Operativo              ║');
      }

      console.log('╠════════════════════════════════════════════════╣');
      console.log('║   🎯 Sistema JARVIS: 100% Operacional         ║');
      console.log('╚════════════════════════════════════════════════╝');
      console.log('');

      this.initialized = true;
      return true;
    } catch (error) {
      console.error('');
      console.error('╔════════════════════════════════════════════════╗');
      console.error('║   ❌ ERROR CRÍTICO - JARVIS Core              ║');
      console.error('╠════════════════════════════════════════════════╣');
      console.error(`║   ${error.message.padEnd(44)} ║`);
      console.error('╚════════════════════════════════════════════════╝');
      console.error('');
      throw error;
    }
  }

  /**
   * Procesa una solicitud completa
   */
  async process(input) {
    if (!this.initialized) {
      throw new Error('JARVIS Core no está inicializado');
    }

    const result = {
      timestamp: Date.now(),
      input: input,
      nlp: null,
      decision: null,
      reasoning: null,
      memory: null,
      response: null
    };

    try {
      // 1. Análisis NLP
      if (this.nlp && typeof input === 'string') {
        result.nlp = await this.nlp.process(input);

        // Almacenar en memoria
        if (this.memory) {
          await this.memory.storeInWorkingMemory({
            type: 'nlp_analysis',
            content: result.nlp,
            importance: result.nlp.analysis.confidence
          });
        }
      }

      // 2. Toma de decisiones
      if (this.decision) {
        const context = {
          domain: input.domain || 'general',
          input: input,
          nlpAnalysis: result.nlp,
          ...input.context
        };

        result.decision = await this.decision.decide(context);

        // Almacenar decisión
        if (this.memory) {
          await this.memory.storeInWorkingMemory({
            type: 'decision',
            content: result.decision,
            importance: result.decision.confidence
          });
        }
      }

      // 3. Razonamiento si es necesario
      if (this.reasoning && input.requireReasoning) {
        if (input.reasoningType === 'deductive') {
          result.reasoning = await this.reasoning.deductiveReasoning(input.query);
        } else if (input.reasoningType === 'inductive') {
          result.reasoning = await this.reasoning.inductiveReasoning(input.observations);
        } else if (input.reasoningType === 'causal') {
          result.reasoning = await this.reasoning.causalReasoning(input.cause, input.effect);
        }
      }

      // 4. Crear tarea autónoma si es necesario
      if (this.autonomous && result.decision?.selected?.action) {
        const action = result.decision.selected.action;

        if (action !== 'no_action') {
          const task = await this.autonomous.createTask({
            type: 'automated',
            description: `Ejecutar acción: ${action}`,
            priority: result.decision.selected.priority,
            metadata: {
              decision: result.decision,
              nlp: result.nlp
            }
          });

          result.task = task;
        }
      }

      // 5. Generar respuesta
      result.response = this.generateResponse(result);

      return result;
    } catch (error) {
      console.error('❌ Error procesando solicitud:', error);
      result.error = error.message;
      return result;
    }
  }

  /**
   * Genera respuesta final
   */
  generateResponse(processingResult) {
    let response = {
      success: !processingResult.error,
      timestamp: Date.now()
    };

    if (processingResult.nlp?.response) {
      response.text = processingResult.nlp.response.text;
      response.intent = processingResult.nlp.response.intent;
    }

    if (processingResult.decision?.selected) {
      response.action = processingResult.decision.selected.action;
      response.confidence = processingResult.decision.confidence;
    }

    if (processingResult.task) {
      response.taskId = processingResult.task.id;
      response.taskStatus = processingResult.task.status;
    }

    if (processingResult.error) {
      response.error = processingResult.error;
    }

    return response;
  }

  /**
   * Obtiene estado del sistema
   */
  async getStatus() {
    const status = {
      initialized: this.initialized,
      timestamp: Date.now(),
      components: {}
    };

    if (this.memory) {
      status.components.memory = {
        enabled: true,
        stats: await this.memory.getStats()
      };
    }

    if (this.nlp) {
      status.components.nlp = {
        enabled: true,
        language: this.nlp.config.language
      };
    }

    if (this.decision) {
      status.components.decision = {
        enabled: true,
        stats: this.decision.getStats()
      };
    }

    if (this.reasoning) {
      status.components.reasoning = {
        enabled: true,
        knowledge: this.reasoning.exportKnowledge()
      };
    }

    if (this.autonomous) {
      status.components.autonomous = {
        enabled: true,
        stats: this.autonomous.getStats()
      };
    }

    return status;
  }

  /**
   * Limpieza y cierre
   */
  async cleanup() {
    console.log('🧹 Limpiando JARVIS Core...');

    if (this.autonomous) {
      await this.autonomous.stop();
    }

    if (this.memory) {
      await this.memory.cleanup();
    }

    this.initialized = false;
    console.log('✅ JARVIS Core limpiado');
  }
}

module.exports = JARVISCore;

// Si se ejecuta directamente, hacer demo
if (require.main === module) {
  (async () => {
    const jarvis = new JARVISCore();

    try {
      await jarvis.initialize();

      // Demo 1: Análisis de texto
      console.log('\n📝 Demo 1: Análisis de texto');
      const result1 = await jarvis.process('Hola, ¿cómo están las ventas de hoy?');
      console.log('Respuesta:', result1.response);

      // Demo 2: Tarea autónoma
      console.log('\n📝 Demo 2: Crear tarea autónoma');
      if (jarvis.autonomous) {
        const task = await jarvis.autonomous.createTask({
          type: 'analysis',
          description: 'Analizar ventas del mes',
          priority: 'high'
        });
        console.log('Tarea creada:', task.id);
      }

      // Demo 3: Estado del sistema
      console.log('\n📊 Estado del sistema:');
      const status = await jarvis.getStatus();
      console.log(JSON.stringify(status, null, 2));

      // Esperar 10 segundos para ver ejecución
      console.log('\n⏳ Esperando 10 segundos...');
      await new Promise(resolve => setTimeout(resolve, 10000));

      // Cleanup
      await jarvis.cleanup();
    } catch (error) {
      console.error('❌ Error en demo:', error);
      process.exit(1);
    }
  })();
}

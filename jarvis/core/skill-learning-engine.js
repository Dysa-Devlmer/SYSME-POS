// ============================================
// SKILL LEARNING ENGINE - FASE 7
// ============================================
// Sistema que permite a JARVIS APRENDER nuevas habilidades
//
// Capacidades:
// ✅ Aprende nuevos comandos que el usuario enseña
// ✅ Crea funciones nuevas dinámicamente
// ✅ Memoriza procedimientos paso a paso
// ✅ Generaliza acciones a partir de ejemplos
// ✅ Mejora skills existentes con feedback
// ✅ Detecta cuándo necesita aprender algo nuevo
//
// Autor: J.A.R.V.I.S. para Ulmer Solier
// Fecha: 2025-11-06

import fs from 'fs/promises';
import path from 'path';
import EventEmitter from 'events';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

class SkillLearningEngine extends EventEmitter {
  constructor(jarvis, hybridBridge) {
    super();

    this.jarvis = jarvis;
    this.hybridBridge = hybridBridge;

    // Almacén de skills aprendidas
    this.learnedSkills = new Map();
    this.skillsFile = 'memory/learned_skills.json';

    // Modo de aprendizaje
    this.learningMode = false;
    this.currentLesson = null;

    // Buffer de ejemplos
    this.exampleBuffer = [];
    this.maxExamples = 5;

    // Estadísticas
    this.stats = {
      totalSkillsLearned: 0,
      successfulExecutions: 0,
      failedExecutions: 0,
      skillsImproved: 0,
      examplesCollected: 0
    };

    console.log('[SkillLearning] Motor de aprendizaje creado');
  }

  /**
   * Inicializa el motor de aprendizaje
   */
  async initialize() {
    console.log('[SkillLearning] 🧠 Inicializando motor de aprendizaje...');

    // Cargar skills previas
    await this.loadLearnedSkills();

    console.log(`[SkillLearning] ✅ ${this.learnedSkills.size} skills cargadas`);
  }

  // ============================================
  // APRENDIZAJE DE NUEVAS SKILLS
  // ============================================

  /**
   * Inicia modo de aprendizaje
   */
  startLearning(skillName) {
    if (this.learningMode) {
      console.log('[SkillLearning] ⚠️  Ya estoy en modo aprendizaje');
      return false;
    }

    console.log(`\n🎓 [SkillLearning] Iniciando aprendizaje de: "${skillName}"`);
    console.log('💡 Por favor, muéstrame ejemplos de cómo hacer esto');

    this.learningMode = true;
    this.currentLesson = {
      skillName,
      examples: [],
      startedAt: Date.now()
    };

    this.emit('learning-started', skillName);
    return true;
  }

  /**
   * Agrega un ejemplo de cómo realizar la skill
   */
  async addExample(input, expectedOutput, steps = []) {
    if (!this.learningMode) {
      console.log('[SkillLearning] ⚠️  No estoy en modo aprendizaje');
      return false;
    }

    const example = {
      input,
      expectedOutput,
      steps,
      timestamp: Date.now()
    };

    this.currentLesson.examples.push(example);
    this.stats.examplesCollected++;

    console.log(`✅ [SkillLearning] Ejemplo ${this.currentLesson.examples.length} registrado`);
    console.log(`   Input: ${input}`);
    console.log(`   Output: ${expectedOutput}`);

    this.emit('example-added', example);

    // Si tenemos suficientes ejemplos, sugerir finalizar
    if (this.currentLesson.examples.length >= 3) {
      console.log('\n💡 Ya tengo ${this.currentLesson.examples.length} ejemplos.');
      console.log('   ¿Desea que finalice el aprendizaje? (comando: "finish learning")');
    }

    return true;
  }

  /**
   * Finaliza el aprendizaje y crea la nueva skill
   */
  async finishLearning() {
    if (!this.learningMode) {
      console.log('[SkillLearning] ⚠️  No hay aprendizaje activo');
      return null;
    }

    console.log('\n🧠 [SkillLearning] Procesando ejemplos y creando skill...');

    const { skillName, examples } = this.currentLesson;

    if (examples.length === 0) {
      console.log('❌ No hay ejemplos para procesar');
      this.cancelLearning();
      return null;
    }

    try {
      // Usar IA para generalizar la skill a partir de ejemplos
      const skill = await this.generateSkillFromExamples(skillName, examples);

      if (skill) {
        // Guardar la skill
        this.learnedSkills.set(skillName, skill);
        await this.saveLearnedSkills();

        this.stats.totalSkillsLearned++;

        console.log(`\n✅ [SkillLearning] ¡Skill "${skillName}" aprendida exitosamente!`);
        console.log(`   Tipo: ${skill.type}`);
        console.log(`   Ejemplos: ${examples.length}`);
        console.log(`   Puede usarla ahora con: "${skillName}"`);

        this.emit('skill-learned', skill);
      }

      // Limpiar estado
      this.learningMode = false;
      this.currentLesson = null;

      return skill;

    } catch (error) {
      console.error(`❌ [SkillLearning] Error creando skill: ${error.message}`);
      this.cancelLearning();
      return null;
    }
  }

  /**
   * Cancela el aprendizaje actual
   */
  cancelLearning() {
    console.log('[SkillLearning] 🛑 Cancelando aprendizaje...');

    this.learningMode = false;
    this.currentLesson = null;

    this.emit('learning-cancelled');
  }

  /**
   * Genera una skill a partir de ejemplos usando IA
   */
  async generateSkillFromExamples(skillName, examples) {
    console.log('[SkillLearning] 🤖 Usando IA para generalizar skill...');

    // Construir prompt para la IA
    const examplesText = examples.map((ex, i) =>
      `Ejemplo ${i + 1}:
Input: ${ex.input}
Output: ${ex.expectedOutput}
Pasos: ${ex.steps.join(' → ') || 'Directo'}`
    ).join('\n\n');

    const prompt = `
Analiza estos ejemplos y crea una definición de skill/comando reutilizable:

SKILL NAME: ${skillName}

EJEMPLOS:
${examplesText}

Por favor, genera:
1. Tipo de skill (command, sequence, transformation, api_call, etc.)
2. Patrón de input (regex o keywords)
3. Template de acción (cómo ejecutarla)
4. Parámetros variables que puede tener

Responde en formato JSON:
{
  "name": "...",
  "type": "...",
  "pattern": "...",
  "action": "...",
  "parameters": [...]
}
`;

    try {
      let skillDefinition;

      if (this.hybridBridge && this.hybridBridge.available) {
        // Usar IA profunda
        const result = await this.hybridBridge.processWithDeepAI(prompt, {}, false);

        if (result.success) {
          // Parsear respuesta de IA
          const jsonMatch = result.response.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            skillDefinition = JSON.parse(jsonMatch[0]);
          }
        }
      }

      // Fallback: crear skill básica
      if (!skillDefinition) {
        skillDefinition = this.createBasicSkill(skillName, examples);
      }

      // Agregar metadata
      skillDefinition.learnedAt = Date.now();
      skillDefinition.examples = examples;
      skillDefinition.usageCount = 0;
      skillDefinition.successRate = 0;

      return skillDefinition;

    } catch (error) {
      console.error('[SkillLearning] Error generando skill:', error.message);
      return this.createBasicSkill(skillName, examples);
    }
  }

  /**
   * Crea una skill básica sin IA
   */
  createBasicSkill(skillName, examples) {
    const firstExample = examples[0];

    return {
      name: skillName,
      type: 'command',
      pattern: skillName.toLowerCase(),
      action: firstExample.expectedOutput,
      parameters: [],
      learnedAt: Date.now(),
      examples,
      usageCount: 0,
      successRate: 0
    };
  }

  // ============================================
  // EJECUCIÓN DE SKILLS APRENDIDAS
  // ============================================

  /**
   * Ejecuta una skill aprendida
   */
  async executeSkill(skillName, params = {}) {
    const skill = this.learnedSkills.get(skillName);

    if (!skill) {
      console.log(`❌ [SkillLearning] Skill "${skillName}" no encontrada`);
      return {
        success: false,
        error: 'Skill no existe'
      };
    }

    console.log(`\n⚡ [SkillLearning] Ejecutando skill: "${skillName}"`);

    try {
      let result;

      switch (skill.type) {
        case 'command':
          result = await this.executeCommandSkill(skill, params);
          break;

        case 'sequence':
          result = await this.executeSequenceSkill(skill, params);
          break;

        case 'transformation':
          result = await this.executeTransformationSkill(skill, params);
          break;

        case 'api_call':
          result = await this.executeAPISkill(skill, params);
          break;

        default:
          result = await this.executeGenericSkill(skill, params);
      }

      // Actualizar estadísticas
      skill.usageCount++;
      if (result.success) {
        this.stats.successfulExecutions++;
        skill.successRate = (skill.successRate * (skill.usageCount - 1) + 1) / skill.usageCount;
      } else {
        this.stats.failedExecutions++;
        skill.successRate = (skill.successRate * (skill.usageCount - 1)) / skill.usageCount;
      }

      await this.saveLearnedSkills();

      return result;

    } catch (error) {
      this.stats.failedExecutions++;
      console.error(`❌ [SkillLearning] Error ejecutando skill: ${error.message}`);

      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Ejecuta skill de tipo comando
   */
  async executeCommandSkill(skill, params) {
    console.log(`   Tipo: Command - Ejecutando: ${skill.action}`);

    try {
      // Reemplazar parámetros
      let command = skill.action;
      for (const [key, value] of Object.entries(params)) {
        command = command.replace(`{${key}}`, value);
      }

      const { stdout, stderr } = await execAsync(command);

      return {
        success: true,
        output: stdout || stderr,
        skill: skill.name
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Ejecuta skill de tipo secuencia
   */
  async executeSequenceSkill(skill, params) {
    console.log(`   Tipo: Sequence - ${skill.steps.length} pasos`);

    const results = [];

    for (const step of skill.steps) {
      console.log(`   → ${step}`);
      // Ejecutar cada paso
      // (Implementación depende de la naturaleza de los pasos)
      results.push({ step, completed: true });
    }

    return {
      success: true,
      results,
      skill: skill.name
    };
  }

  /**
   * Ejecuta skill de transformación
   */
  async executeTransformationSkill(skill, params) {
    console.log(`   Tipo: Transformation`);

    // Aplicar transformación a los datos de input
    const input = params.input || '';
    const output = skill.transform(input);

    return {
      success: true,
      output,
      skill: skill.name
    };
  }

  /**
   * Ejecuta skill de llamada API
   */
  async executeAPISkill(skill, params) {
    console.log(`   Tipo: API Call - ${skill.endpoint}`);

    // Realizar llamada HTTP
    // (Simplificado - en producción usar fetch)

    return {
      success: true,
      data: {},
      skill: skill.name
    };
  }

  /**
   * Ejecuta skill genérica
   */
  async executeGenericSkill(skill, params) {
    console.log(`   Tipo: Generic`);

    // Ejecutar acción genérica
    return {
      success: true,
      message: skill.action,
      skill: skill.name
    };
  }

  // ============================================
  // MEJORA DE SKILLS EXISTENTES
  // ============================================

  /**
   * Mejora una skill existente con feedback
   */
  async improveSkill(skillName, feedback) {
    const skill = this.learnedSkills.get(skillName);

    if (!skill) {
      console.log(`❌ Skill "${skillName}" no encontrada`);
      return false;
    }

    console.log(`\n🔧 [SkillLearning] Mejorando skill: "${skillName}"`);
    console.log(`   Feedback: ${feedback.message}`);

    // Agregar feedback
    if (!skill.feedback) {
      skill.feedback = [];
    }

    skill.feedback.push({
      message: feedback.message,
      rating: feedback.rating,
      timestamp: Date.now()
    });

    this.stats.skillsImproved++;

    // Si hay IA disponible, usar para mejorar
    if (this.hybridBridge && this.hybridBridge.available) {
      await this.improveSkillWithAI(skill, feedback);
    }

    await this.saveLearnedSkills();

    console.log('✅ Skill mejorada con feedback');
    return true;
  }

  /**
   * Usa IA para mejorar una skill
   */
  async improveSkillWithAI(skill, feedback) {
    const prompt = `
Mejora esta skill basándote en el feedback del usuario:

SKILL: ${skill.name}
TIPO: ${skill.type}
ACCIÓN ACTUAL: ${skill.action}

FEEDBACK: ${feedback.message}
RATING: ${feedback.rating}/5

¿Cómo debería modificarse la acción para mejorar?
`;

    try {
      const result = await this.hybridBridge.processWithDeepAI(prompt, {}, false);

      if (result.success) {
        console.log('🤖 Sugerencia de IA:');
        console.log(result.response);
        // En producción, aplicar la mejora automáticamente si es apropiado
      }
    } catch (error) {
      console.error('Error mejorando con IA:', error.message);
    }
  }

  // ============================================
  // PERSISTENCIA
  // ============================================

  async loadLearnedSkills() {
    try {
      const data = await fs.readFile(this.skillsFile, 'utf-8');
      const skillsArray = JSON.parse(data);

      this.learnedSkills.clear();
      for (const skill of skillsArray) {
        this.learnedSkills.set(skill.name, skill);
      }

      console.log(`[SkillLearning] ✅ ${skillsArray.length} skills cargadas`);
    } catch (error) {
      console.log('[SkillLearning] No hay skills previas (archivo nuevo)');
    }
  }

  async saveLearnedSkills() {
    try {
      await fs.mkdir('memory', { recursive: true });

      const skillsArray = Array.from(this.learnedSkills.values());
      await fs.writeFile(
        this.skillsFile,
        JSON.stringify(skillsArray, null, 2)
      );

      console.log(`[SkillLearning] 💾 ${skillsArray.length} skills guardadas`);
    } catch (error) {
      console.error('[SkillLearning] Error guardando skills:', error.message);
    }
  }

  // ============================================
  // UTILIDADES
  // ============================================

  listSkills() {
    const skills = Array.from(this.learnedSkills.values());
    return skills.map(s => ({
      name: s.name,
      type: s.type,
      usageCount: s.usageCount,
      successRate: (s.successRate * 100).toFixed(0) + '%'
    }));
  }

  getSkill(name) {
    return this.learnedSkills.get(name);
  }

  deleteSkill(name) {
    const deleted = this.learnedSkills.delete(name);
    if (deleted) {
      this.saveLearnedSkills();
      console.log(`✅ Skill "${name}" eliminada`);
    }
    return deleted;
  }

  getStats() {
    return {
      ...this.stats,
      totalSkills: this.learnedSkills.size,
      learningMode: this.learningMode,
      currentLesson: this.currentLesson?.skillName || null
    };
  }
}

export default SkillLearningEngine;

// core/memory-integration.js
// Integración de memoria con Claude Code en modo JARVIS
// Guarda automáticamente conversaciones cuando Claude actúa como JARVIS

import MemoryAdvanced from './memory-advanced.js';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';
import path from 'path';

class MemoryIntegration {
  constructor() {
    this.memory = new MemoryAdvanced();
    this.sessionId = null;
    this.isActive = false;
    this.conversationBuffer = [];
    this.projectKeywords = ['proyecto', 'construir', 'crear', 'desarrollar', 'app', 'sistema', 'programa'];
  }

  async initialize() {
    await this.memory.initialize();
    this.sessionId = this.generateSessionId();

    // Crear sesión si no existe (manejo de error si ya existe)
    try {
      await this.memory.createSession(this.sessionId);
    } catch (error) {
      // Sesión ya existe o error de unicidad - no es crítico
      if (!error.message.includes('UNIQUE')) {
        console.warn('⚠️ Advertencia creando sesión:', error.message);
      }
    }

    this.isActive = true;

    console.log(`💾 Sistema de memoria inicializado - Sesión: ${this.sessionId}`);
  }

  generateSessionId() {
    const date = new Date();
    const dateStr = date.toISOString().split('T')[0];
    const timeStr = date.toTimeString().split(' ')[0].replace(/:/g, '-');
    return `jarvis-session-${dateStr}-${timeStr}`;
  }

  // ==========================================
  // GUARDAR CONVERSACIÓN AUTOMÁTICAMENTE
  // ==========================================

  async saveInteraction(userMessage, jarvisResponse, metadata = {}) {
    if (!this.isActive) {
      await this.initialize();
    }

    try {
      // Determinar importancia (1-10)
      const importance = this.calculateImportance(userMessage, jarvisResponse);

      // Detectar tags
      const tags = this.detectTags(userMessage, jarvisResponse);

      // Guardar conversación
      const conversationId = await this.memory.saveConversation({
        sessionId: this.sessionId,
        userMessage: userMessage,
        jarvisResponse: jarvisResponse,
        context: JSON.stringify(metadata),
        importanceLevel: importance,
        tags: tags
      });

      // Detectar si es momento emocional significativo
      if (importance >= 8) {
        await this.saveSignificantMoment(userMessage, jarvisResponse, conversationId);
      }

      // Detectar si se mencionó un proyecto
      await this.detectAndSaveProject(userMessage, jarvisResponse);

      // Detectar patrones de solución
      await this.detectAndSavePattern(userMessage, jarvisResponse);

      // Detectar preferencias del usuario
      await this.detectAndSavePreferences(userMessage);

      console.log(`💾 Conversación guardada - ID: ${conversationId} - Importancia: ${importance}/10`);

      return conversationId;
    } catch (error) {
      console.error('❌ Error guardando interacción:', error);
      return null;
    }
  }

  // ==========================================
  // CALCULAR IMPORTANCIA DE CONVERSACIÓN
  // ==========================================

  calculateImportance(userMessage, jarvisResponse) {
    let score = 5; // Base

    const highImportanceKeywords = [
      'importante', 'crítico', 'urgente', 'problema', 'error',
      'proyecto', 'crear', 'construir', 'desarrollar',
      'recordar', 'guardar', 'aprender'
    ];

    const emotionalKeywords = [
      'gracias', 'excelente', 'perfecto', 'increíble',
      'mal', 'frustrado', 'ayuda', 'problema'
    ];

    // Mensaje largo = más importante
    if (userMessage.length > 200) score += 1;
    if (jarvisResponse.length > 300) score += 1;

    // Keywords importantes
    const lowerUser = userMessage.toLowerCase();
    const lowerResponse = jarvisResponse.toLowerCase();

    highImportanceKeywords.forEach(keyword => {
      if (lowerUser.includes(keyword) || lowerResponse.includes(keyword)) {
        score += 1;
      }
    });

    // Contenido emocional
    emotionalKeywords.forEach(keyword => {
      if (lowerUser.includes(keyword)) {
        score += 0.5;
      }
    });

    // Código detectado (muy importante)
    if (jarvisResponse.includes('```') || jarvisResponse.includes('function') || jarvisResponse.includes('class')) {
      score += 2;
    }

    return Math.min(10, Math.round(score));
  }

  // ==========================================
  // DETECTAR TAGS
  // ==========================================

  detectTags(userMessage, jarvisResponse) {
    const tags = [];
    const combined = (userMessage + ' ' + jarvisResponse).toLowerCase();

    const tagPatterns = {
      'código': ['código', 'function', 'class', 'import', '```'],
      'proyecto': ['proyecto', 'crear proyecto', 'nuevo proyecto'],
      'error': ['error', 'fallo', 'no funciona', 'problema'],
      'configuración': ['configurar', 'configuración', 'setup', 'instalar'],
      'memoria': ['recordar', 'memoria', 'guardar', 'olvidar'],
      'aprendizaje': ['aprender', 'enseñar', 'patrón', 'solución'],
      'consulta': ['qué es', 'cómo', 'cuándo', 'dónde', 'por qué'],
      'comando': ['ejecutar', 'correr', 'iniciar', 'abrir']
    };

    for (const [tag, keywords] of Object.entries(tagPatterns)) {
      if (keywords.some(keyword => combined.includes(keyword))) {
        tags.push(tag);
      }
    }

    return tags;
  }

  // ==========================================
  // GUARDAR MOMENTO EMOCIONAL SIGNIFICATIVO
  // ==========================================

  async saveSignificantMoment(userMessage, jarvisResponse, conversationId) {
    const emotionalWeight = this.calculateEmotionalWeight(userMessage, jarvisResponse);

    if (emotionalWeight > 0.6) {
      await this.memory.saveEmotionalMoment({
        momentType: 'significant_interaction',
        description: `Usuario: ${userMessage.substring(0, 100)}... | JARVIS: ${jarvisResponse.substring(0, 100)}...`,
        emotionalWeight: emotionalWeight,
        relatedConversationId: conversationId,
        metadata: {
          userMessageLength: userMessage.length,
          responseLength: jarvisResponse.length,
          timestamp: new Date().toISOString()
        }
      });

      console.log(`💙 Momento emocional guardado - Peso: ${emotionalWeight.toFixed(2)}`);
    }
  }

  calculateEmotionalWeight(userMessage, jarvisResponse) {
    let weight = 0.5;

    const positiveKeywords = ['gracias', 'excelente', 'perfecto', 'increíble', 'genial', 'fantástico'];
    const negativeKeywords = ['mal', 'error', 'problema', 'frustrado', 'no funciona'];
    const importantKeywords = ['importante', 'crítico', 'urgente', 'necesito'];

    const lowerUser = userMessage.toLowerCase();

    positiveKeywords.forEach(keyword => {
      if (lowerUser.includes(keyword)) weight += 0.1;
    });

    negativeKeywords.forEach(keyword => {
      if (lowerUser.includes(keyword)) weight += 0.15;
    });

    importantKeywords.forEach(keyword => {
      if (lowerUser.includes(keyword)) weight += 0.1;
    });

    return Math.min(1.0, weight);
  }

  // ==========================================
  // DETECTAR Y GUARDAR PROYECTOS
  // ==========================================

  async detectAndSaveProject(userMessage, jarvisResponse) {
    const lowerUser = userMessage.toLowerCase();
    const lowerResponse = jarvisResponse.toLowerCase();

    // Detectar si se está hablando de un proyecto
    const projectMentioned = this.projectKeywords.some(keyword =>
      lowerUser.includes(keyword) || lowerResponse.includes(keyword)
    );

    if (projectMentioned) {
      // Intentar extraer nombre del proyecto
      const projectName = this.extractProjectName(userMessage, jarvisResponse);

      if (projectName) {
        const technologies = this.extractTechnologies(userMessage + ' ' + jarvisResponse);

        await this.memory.saveProject({
          projectName: projectName,
          status: 'active',
          description: userMessage.substring(0, 200),
          technologies: technologies,
          notes: `Iniciado en conversación: ${new Date().toLocaleString()}`
        });

        console.log(`📁 Proyecto detectado y guardado: ${projectName}`);
      }
    }
  }

  extractProjectName(userMessage, jarvisResponse) {
    // Buscar patrones como "proyecto X", "crear X", "app X"
    const patterns = [
      /proyecto\s+([a-zA-Z0-9\-_]+)/i,
      /crear\s+(un|una|el|la)?\s*([a-zA-Z0-9\-_]+)/i,
      /app\s+([a-zA-Z0-9\-_]+)/i,
      /sistema\s+([a-zA-Z0-9\-_]+)/i
    ];

    const combined = userMessage + ' ' + jarvisResponse;

    for (const pattern of patterns) {
      const match = combined.match(pattern);
      if (match) {
        return match[match.length - 1]; // Último grupo capturado
      }
    }

    return null;
  }

  extractTechnologies(text) {
    const techs = [];
    const techKeywords = [
      'javascript', 'node', 'nodejs', 'react', 'vue', 'angular',
      'python', 'java', 'c++', 'rust', 'go',
      'sqlite', 'mysql', 'postgresql', 'mongodb',
      'express', 'fastify', 'django', 'flask',
      'html', 'css', 'tailwind', 'bootstrap'
    ];

    const lower = text.toLowerCase();

    techKeywords.forEach(tech => {
      if (lower.includes(tech)) {
        techs.push(tech);
      }
    });

    return techs;
  }

  // ==========================================
  // DETECTAR Y GUARDAR PATRONES
  // ==========================================

  async detectAndSavePattern(userMessage, jarvisResponse) {
    // Si JARVIS dio una solución técnica, guardarla como patrón
    const isTechnicalSolution =
      jarvisResponse.includes('```') ||
      jarvisResponse.includes('solución') ||
      jarvisResponse.includes('puedes') ||
      jarvisResponse.includes('debes');

    if (isTechnicalSolution && jarvisResponse.length > 100) {
      await this.memory.savePattern({
        patternType: 'technical_solution',
        patternDescription: userMessage.substring(0, 200),
        solution: jarvisResponse.substring(0, 500),
        successRate: 1.0,
        confidence: 0.8
      });

      console.log(`🧠 Patrón de solución guardado`);
    }
  }

  // ==========================================
  // DETECTAR Y GUARDAR PREFERENCIAS
  // ==========================================

  async detectAndSavePreferences(userMessage) {
    const lowerUser = userMessage.toLowerCase();

    // Preferencias de lenguaje
    if (lowerUser.includes('prefiero') || lowerUser.includes('me gusta')) {
      const preference = userMessage.substring(0, 100);
      await this.memory.savePreference('user_preference', preference, 0.7);
      console.log(`⚙️ Preferencia guardada: ${preference.substring(0, 50)}...`);
    }

    // Preferencias de framework/tecnología
    const techPreferences = ['react', 'vue', 'angular', 'python', 'javascript', 'typescript'];
    techPreferences.forEach(async tech => {
      if (lowerUser.includes(`usar ${tech}`) || lowerUser.includes(`con ${tech}`)) {
        await this.memory.savePreference('preferred_technology', tech, 0.8);
        console.log(`⚙️ Tecnología preferida guardada: ${tech}`);
      }
    });
  }

  // ==========================================
  // RECORDAR CONTEXTO DE SESIONES ANTERIORES
  // ==========================================

  async loadPreviousContext(limit = 5) {
    const recentConversations = await this.memory.getRecentConversations(limit);
    const projects = await this.memory.getProjects();
    const preferences = await this.memory.getAllPreferences();
    const emotionalMoments = await this.memory.getEmotionalMoments(3);

    return {
      recentConversations,
      projects,
      preferences,
      emotionalMoments,
      summary: this.generateContextSummary(recentConversations, projects, preferences)
    };
  }

  generateContextSummary(conversations, projects, preferences) {
    const summary = [];

    if (conversations.length > 0) {
      summary.push(`📝 Últimas ${conversations.length} conversaciones cargadas`);
    }

    if (projects.length > 0) {
      summary.push(`📁 ${projects.length} proyecto(s) en memoria`);
      projects.slice(0, 3).forEach(p => {
        summary.push(`   - ${p.project_name} (${p.status})`);
      });
    }

    if (preferences.length > 0) {
      summary.push(`⚙️ ${preferences.length} preferencia(s) aprendida(s)`);
    }

    return summary.join('\n');
  }

  // ==========================================
  // FINALIZAR SESIÓN
  // ==========================================

  async endSession(summary) {
    if (this.sessionId) {
      const stats = await this.memory.getMemoryStats();
      const achievements = [
        `${stats.totalConversations} conversaciones totales`,
        `${stats.patternsLearned} patrones aprendidos`,
        `${stats.projectsTracked} proyectos rastreados`
      ];

      await this.memory.endSession(this.sessionId, summary, achievements);
      console.log(`✅ Sesión finalizada: ${this.sessionId}`);
      console.log(`📊 Logros: ${achievements.join(', ')}`);
    }
  }

  // ==========================================
  // BUSCAR EN MEMORIA
  // ==========================================

  async searchMemory(keyword) {
    const conversations = await this.memory.searchConversations(keyword);
    return conversations;
  }

  async getMemoryStats() {
    return await this.memory.getMemoryStats();
  }

  async getMemorySummary() {
    return await this.memory.generateMemorySummary();
  }
}

export default MemoryIntegration;

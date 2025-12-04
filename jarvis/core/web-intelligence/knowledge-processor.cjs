// core/web-intelligence/knowledge-processor.cjs
// Procesador de conocimiento - JARVIS entiende lo que encuentra

const axios = require('axios');
const { EventEmitter } = require('events');

/**
 * Knowledge Processor
 *
 * Usa Ollama para:
 * - Entender contenido extraído
 * - Extraer conceptos clave
 * - Generar resúmenes
 * - Crear relaciones entre conocimientos
 */
class KnowledgeProcessor extends EventEmitter {
  constructor(options = {}) {
    super();

    this.ollamaUrl = options.ollamaUrl || 'http://localhost:11434';
    this.model = options.model || 'qwen2.5-coder:latest';
    this.timeout = options.timeout || 60000;
  }

  /**
   * Procesa contenido y extrae conocimiento
   */
  async process(content) {
    console.log(`🧠 [Knowledge Processor] Procesando contenido de: ${content.url}`);
    this.emit('process:start', { url: content.url });

    try {
      // Generar prompt basado en tipo de contenido
      const prompt = this.generatePrompt(content);

      // Procesar con Ollama
      const analysis = await this.analyzeWithOllama(prompt);

      // Extraer entidades y conceptos
      const entities = this.extractEntities(analysis);

      // Generar knowledge object
      const knowledge = {
        url: content.url,
        type: content.type,
        title: content.title,
        summary: analysis.summary,
        concepts: analysis.concepts || [],
        codeExamples: content.codeExamples || content.code || [],
        entities,
        keyPoints: analysis.keyPoints || [],
        useCases: analysis.useCases || [],
        timestamp: Date.now(),
        confidence: this.calculateConfidence(content, analysis)
      };

      console.log(`✅ [Knowledge Processor] ${knowledge.concepts.length} conceptos extraídos`);
      this.emit('process:complete', { url: content.url, concepts: knowledge.concepts.length });

      return knowledge;
    } catch (error) {
      console.error(`❌ [Knowledge Processor] Error: ${error.message}`);
      this.emit('process:error', { url: content.url, error: error.message });

      // Fallback: procesamiento básico sin IA
      return this.basicProcessing(content);
    }
  }

  /**
   * Genera prompt para Ollama basado en el tipo de contenido
   */
  generatePrompt(content) {
    const text = content.text || '';

    switch (content.type) {
      case 'stackoverflow':
        return `Analiza esta pregunta y respuesta de Stack Overflow:

Pregunta: ${content.title}
${content.question}

Respuesta:
${content.answer}

Por favor extrae:
1. Resumen del problema
2. Conceptos técnicos clave (lista)
3. Solución propuesta (paso a paso)
4. Casos de uso donde aplicar esta solución

Responde en formato JSON:
{
  "summary": "breve resumen",
  "concepts": ["concepto1", "concepto2"],
  "keyPoints": ["punto1", "punto2"],
  "useCases": ["uso1", "uso2"]
}`;

      case 'github':
        return `Analiza este repositorio de GitHub:

Título: ${content.title}
Descripción: ${content.description}

README:
${text.substring(0, 2000)}

Por favor extrae:
1. Propósito del proyecto
2. Tecnologías usadas (lista)
3. Conceptos clave implementados
4. Casos de uso principales

Responde en formato JSON:
{
  "summary": "propósito del proyecto",
  "concepts": ["tecnología1", "tecnología2"],
  "keyPoints": ["característica1", "característica2"],
  "useCases": ["uso1", "uso2"]
}`;

      case 'mdn':
        return `Analiza esta documentación técnica de MDN:

${content.title}
${content.description}

${text.substring(0, 2000)}

Por favor extrae:
1. Resumen del concepto
2. Conceptos relacionados
3. Puntos clave a recordar
4. Casos de uso prácticos

Responde en formato JSON:
{
  "summary": "explicación del concepto",
  "concepts": ["concepto1", "concepto2"],
  "keyPoints": ["punto1", "punto2"],
  "useCases": ["uso1", "uso2"]
}`;

      default:
        return `Analiza este contenido técnico:

${text.substring(0, 2000)}

Por favor extrae:
1. Resumen
2. Conceptos técnicos mencionados
3. Puntos clave
4. Aplicaciones prácticas

Responde en formato JSON:
{
  "summary": "resumen breve",
  "concepts": ["concepto1", "concepto2"],
  "keyPoints": ["punto1", "punto2"],
  "useCases": ["uso1", "uso2"]
}`;
    }
  }

  /**
   * Analiza con Ollama
   */
  async analyzeWithOllama(prompt) {
    try {
      const response = await axios.post(
        `${this.ollamaUrl}/api/generate`,
        {
          model: this.model,
          prompt: prompt,
          stream: false,
          options: {
            temperature: 0.3, // Más determinístico
            num_predict: 1000
          }
        },
        { timeout: this.timeout }
      );

      const text = response.data.response;

      // Intentar parsear JSON
      try {
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          return JSON.parse(jsonMatch[0]);
        }
      } catch (e) {
        // Si no es JSON válido, extraer manualmente
        return this.extractFromText(text);
      }

      return this.extractFromText(text);
    } catch (error) {
      console.error(`❌ [Ollama] Error: ${error.message}`);
      throw error;
    }
  }

  /**
   * Extrae información del texto de respuesta
   */
  extractFromText(text) {
    const lines = text.split('\n');

    return {
      summary: text.substring(0, 300),
      concepts: this.extractListItems(text, ['concepto', 'tecnología', 'framework', 'librería']),
      keyPoints: this.extractListItems(text, ['punto', 'key', 'importante']),
      useCases: this.extractListItems(text, ['uso', 'aplicación', 'case'])
    };
  }

  /**
   * Extrae items de lista del texto
   */
  extractListItems(text, keywords) {
    const items = [];
    const lines = text.split('\n');

    for (const line of lines) {
      const trimmed = line.trim();
      // Buscar líneas que empiecen con -, *, números, o contengan keywords
      if (
        trimmed.match(/^[-*\d]/) ||
        keywords.some(kw => trimmed.toLowerCase().includes(kw))
      ) {
        const cleaned = trimmed.replace(/^[-*\d.)\s]+/, '').trim();
        if (cleaned.length > 5 && cleaned.length < 200) {
          items.push(cleaned);
        }
      }
    }

    return items.slice(0, 10); // Máximo 10 items
  }

  /**
   * Extrae entidades nombradas
   */
  extractEntities(analysis) {
    const entities = {
      technologies: [],
      frameworks: [],
      libraries: [],
      concepts: []
    };

    const allText = JSON.stringify(analysis).toLowerCase();

    // Tecnologías comunes
    const technologies = ['javascript', 'typescript', 'python', 'java', 'go', 'rust', 'c++', 'node.js', 'nodejs'];
    // Frameworks
    const frameworks = ['react', 'vue', 'angular', 'next.js', 'express', 'django', 'flask', 'spring'];
    // Librerías
    const libraries = ['axios', 'lodash', 'moment', 'jquery', 'redux', 'mobx'];

    technologies.forEach(tech => {
      if (allText.includes(tech)) entities.technologies.push(tech);
    });

    frameworks.forEach(fw => {
      if (allText.includes(fw)) entities.frameworks.push(fw);
    });

    libraries.forEach(lib => {
      if (allText.includes(lib)) entities.libraries.push(lib);
    });

    return entities;
  }

  /**
   * Calcula confianza del conocimiento extraído
   */
  calculateConfidence(content, analysis) {
    let confidence = 0.5;

    // Boost por fuente
    if (content.type === 'mdn') confidence += 0.3;
    if (content.type === 'stackoverflow' && content.isAnswered) confidence += 0.2;
    if (content.type === 'github' && content.stars > 1000) confidence += 0.2;

    // Boost si tiene código de ejemplo
    if (content.codeExamples && content.codeExamples.length > 0) confidence += 0.1;

    // Boost si tiene resumen coherente
    if (analysis.summary && analysis.summary.length > 50) confidence += 0.1;

    // Boost si tiene conceptos extraídos
    if (analysis.concepts && analysis.concepts.length > 0) confidence += 0.1;

    return Math.min(confidence, 1.0);
  }

  /**
   * Procesamiento básico sin IA (fallback)
   */
  basicProcessing(content) {
    console.log('⚠️ [Knowledge Processor] Usando procesamiento básico (Ollama no disponible)');

    return {
      url: content.url,
      type: content.type,
      title: content.title,
      summary: content.text ? content.text.substring(0, 300) : '',
      concepts: [],
      codeExamples: content.codeExamples || [],
      entities: {},
      keyPoints: [],
      useCases: [],
      timestamp: Date.now(),
      confidence: 0.3
    };
  }

  /**
   * Procesa múltiples contenidos
   */
  async processMultiple(contents) {
    console.log(`🧠 [Knowledge Processor] Procesando ${contents.length} contenidos...`);

    const promises = contents.map(content =>
      this.process(content).catch(err => {
        console.error(`❌ Error procesando ${content.url}:`, err.message);
        return this.basicProcessing(content);
      })
    );

    const results = await Promise.all(promises);

    console.log(`✅ [Knowledge Processor] ${results.length} conocimientos procesados`);

    return results;
  }
}

module.exports = KnowledgeProcessor;

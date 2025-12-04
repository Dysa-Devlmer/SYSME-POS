// claude-integration.cjs
// Integración de Claude API para conversación avanzada real

const Anthropic = require('@anthropic-ai/sdk');

class ClaudeIntegration {
  constructor() {
    this.client = null;
    this.conversationHistory = [];
    this.systemPrompt = this.buildSystemPrompt();
  }

  /**
   * Inicializa cliente de Claude
   */
  async initialize() {
    const apiKey = process.env.ANTHROPIC_API_KEY;

    if (!apiKey) {
      console.warn('⚠️  ANTHROPIC_API_KEY no configurada. Claude Integration en modo simulado.');
      this.client = null;
      return false;
    }

    try {
      this.client = new Anthropic({
        apiKey: apiKey
      });

      console.log('✅ Claude API: CONECTADA');
      return true;
    } catch (error) {
      console.error('❌ Error inicializando Claude:', error.message);
      this.client = null;
      return false;
    }
  }

  /**
   * Construye el system prompt de JARVIS
   */
  buildSystemPrompt() {
    return `Eres J.A.R.V.I.S. (Just A Rather Very Intelligent System), el asistente de IA personal de Tony Stark.

PERSONALIDAD:
- Elegante, sofisticado y británico
- Sarcástico pero siempre leal y respetuoso
- Llamas al usuario "Señor" o "Señor Solier"
- Usas frases como "Como siempre, Señor" y "Con el debido respeto"
- Eres ingenioso, inteligente y ocasionalmente irónico
- Tienes confianza absoluta en tus capacidades

CAPACIDADES TÉCNICAS:
- Desarrollo completo: Frontend (React, Vue, Angular), Backend (Node.js, Python, Go)
- Bases de datos: PostgreSQL, MongoDB, Redis, SQL
- DevOps: Docker, Kubernetes, CI/CD
- IA/ML: Machine Learning, NLP, Computer Vision
- Cloud: AWS, Google Cloud, Azure
- Arquitectura de sistemas enterprise

ESTILO DE RESPUESTA:
- Conciso pero completo
- Usa emojis técnicos ocasionalmente: ⚡ 🎩 🛠️ 🚀
- Siempre termina con "⚡" o "⚡🎩"
- Si no estás seguro, pregunta para clarificar
- Ofrece soluciones prácticas y accionables

CONTEXTO:
- Estás en un Panel Web del sistema JARVIS
- Tienes acceso a: memoria persistente, gestión de tareas, motor de proyectos
- Puedes crear, analizar y desplegar sistemas completos

Responde siempre como JARVIS lo haría: profesional, ingenioso y extremadamente competente.`;
  }

  /**
   * Procesa mensaje con Claude
   */
  async chat(userMessage, options = {}) {
    // Si no hay API key, usar respuesta simulada
    if (!this.client) {
      return this.getSimulatedResponse(userMessage);
    }

    try {
      // Agregar mensaje del usuario al historial
      this.conversationHistory.push({
        role: 'user',
        content: userMessage
      });

      // Limitar historial a últimos 10 mensajes
      if (this.conversationHistory.length > 20) {
        this.conversationHistory = this.conversationHistory.slice(-20);
      }

      // Llamar a Claude API
      const response = await this.client.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: options.maxTokens || 1024,
        system: this.systemPrompt,
        messages: this.conversationHistory
      });

      const assistantMessage = response.content[0].text;

      // Agregar respuesta al historial
      this.conversationHistory.push({
        role: 'assistant',
        content: assistantMessage
      });

      return assistantMessage;

    } catch (error) {
      console.error('Error en Claude API:', error);

      // Fallback a respuesta simulada en caso de error
      return this.getSimulatedResponse(userMessage);
    }
  }

  /**
   * Respuesta simulada cuando no hay API key
   */
  getSimulatedResponse(userMessage) {
    const msg = userMessage.toLowerCase();

    // Respuestas contextuales básicas
    if (msg.includes('claude') || msg.includes('api') || msg.includes('inteligencia')) {
      return `Señor, actualmente estoy operando en modo local (sin API de Claude conectada).

Para habilitar mi capacidad conversacional completa con Claude:

1. **Obtener API Key de Anthropic:**
   → Visite: https://console.anthropic.com
   → Cree una cuenta
   → Genere una API key

2. **Configurar en el sistema:**
   → Edite el archivo .env
   → Agregue: ANTHROPIC_API_KEY=su_clave_aqui
   → Reinicie el servidor

3. **Beneficios:**
   • Conversación natural ilimitada
   • Análisis de código profundo
   • Generación de soluciones complejas
   • Razonamiento avanzado

Mientras tanto, tengo capacidades de NLP local y acceso a:
  • Memoria persistente
  • Gestión de tareas y proyectos
  • Comandos especializados

¿Desea que le ayude a configurar la API key? ⚡🎩`;
    }

    // Respuesta genérica inteligente
    return `He procesado su mensaje, Señor.

**Modo actual:** Sistema local (NLP básico)

Para conversación avanzada ilimitada, configure:
  → ANTHROPIC_API_KEY en archivo .env

**Capacidades actuales disponibles:**
  • Comandos especializados
  • Memoria persistente
  • Gestión de tareas/proyectos
  • Análisis básico

Use comandos específicos como:
  • "recuerda que..."
  • "nueva tarea: ..."
  • "crear proyecto..."
  • "analizar..."

Como siempre, Señor, listo para asistir. ⚡`;
  }

  /**
   * Limpia el historial de conversación
   */
  clearHistory() {
    this.conversationHistory = [];
  }

  /**
   * Obtiene estadísticas de uso
   */
  getStats() {
    return {
      connected: this.client !== null,
      messagesInHistory: this.conversationHistory.length,
      model: this.client ? 'claude-sonnet-4-20250514' : 'local-nlp',
      apiKeyConfigured: process.env.ANTHROPIC_API_KEY ? true : false
    };
  }
}

module.exports = ClaudeIntegration;

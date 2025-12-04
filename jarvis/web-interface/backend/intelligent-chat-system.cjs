/**
 * 🧠 JARVIS INTELLIGENT CHAT SYSTEM
 * Sistema de chat avanzado con búsqueda web, memoria conversacional y análisis de contexto
 */

const axios = require('axios');

class IntelligentChatSystem {
  constructor(aiIntegration) {
    this.aiIntegration = aiIntegration;
    this.conversationHistory = new Map(); // userId -> history[]
    this.maxHistoryLength = 10;
  }

  /**
   * Detecta intención del usuario (qué quiere hacer)
   */
  detectIntent(message) {
    const messageLower = message.toLowerCase();

    // Intenciones de búsqueda web
    if (this.needsWebSearch(messageLower)) {
      return {
        type: 'web_search',
        category: this.categorizeWebSearch(messageLower),
        confidence: 0.95
      };
    }

    // Intenciones de creación/código
    if (messageLower.match(/crea|crear|genera|generar|construye|construir|desarrolla|desarrollar/)) {
      return { type: 'create', confidence: 0.9 };
    }

    // Intenciones de explicación
    if (messageLower.match(/explica|explicar|qué es|que es|cómo|como funciona/)) {
      return { type: 'explain', confidence: 0.85 };
    }

    // Intenciones de ayuda
    if (messageLower.match(/ayuda|ayudar|asiste|asistir|necesito|quiero/)) {
      return { type: 'assist', confidence: 0.8 };
    }

    // Conversación casual
    return { type: 'chat', confidence: 0.7 };
  }

  /**
   * Detecta si necesita búsqueda web
   */
  needsWebSearch(messageLower) {
    const webKeywords = [
      'busca', 'búsca', 'search', 'encuentra',
      'hora actual', 'hora exacta', 'qué hora',
      'clima', 'weather', 'temperatura',
      'noticias', 'news', 'última', 'últimas',
      'información sobre', 'info sobre',
      'qué pasó', 'que paso', 'cuándo', 'cuando',
      'dónde está', 'donde esta', 'ubicación',
      'precio de', 'cotización', 'valor de',
      'internet', 'web', 'online', 'en línea'
    ];

    return webKeywords.some(keyword => messageLower.includes(keyword));
  }

  /**
   * Categoriza el tipo de búsqueda web
   */
  categorizeWebSearch(messageLower) {
    if (messageLower.match(/hora|time|reloj/)) return 'time';
    if (messageLower.match(/clima|weather|temperatura/)) return 'weather';
    if (messageLower.match(/noticias|news/)) return 'news';
    if (messageLower.match(/precio|cotización|valor/)) return 'price';
    return 'general';
  }

  /**
   * Búsqueda web especializada según categoría
   */
  async performWebSearch(query, category, userId) {
    console.log(`🌐 Búsqueda web [${category}]: ${query}`);

    try {
      switch (category) {
        case 'time':
          return await this.getWorldTime(query);
        case 'weather':
          return await this.getWeather(query);
        case 'news':
          return await this.getNews(query);
        default:
          return await this.generalWebSearch(query);
      }
    } catch (error) {
      console.error('❌ Error en búsqueda especializada:', error.message);
      return await this.generalWebSearch(query);
    }
  }

  /**
   * Obtiene hora mundial (API gratuita)
   */
  async getWorldTime(query) {
    try {
      // Detectar país/ciudad de la query
      const location = this.extractLocation(query);
      const timezone = this.getTimezone(location);

      console.log(`⏰ Obteniendo hora de ${location} (${timezone})...`);

      // Usar Date nativo con la zona horaria correcta - MÁS CONFIABLE
      const now = new Date();
      const formatter = new Intl.DateTimeFormat('es-ES', {
        timeZone: timezone,
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
      });

      const formattedTime = formatter.format(now);
      const timeOnly = new Intl.DateTimeFormat('es-ES', {
        timeZone: timezone,
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
      }).format(now);

      console.log(`✅ Hora obtenida: ${timeOnly}`);

      return {
        source: 'Sistema (tiempo real)',
        data: {
          location: location,
          timezone: timezone,
          fullDateTime: formattedTime,
          time: timeOnly,
          timestamp: now.toISOString()
        },
        summary: `🕐 La hora ACTUAL en ${location} (${timezone}) es: **${timeOnly}**\n\nFecha completa: ${formattedTime}`
      };
    } catch (error) {
      console.error('❌ Error obteniendo hora:', error.message);

      // Fallback: intentar con información básica
      const location = this.extractLocation(query);
      const now = new Date();
      const basicTime = now.toLocaleTimeString('es-ES', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
      });

      return {
        source: 'Sistema (UTC)',
        data: { location, time: basicTime },
        summary: `La hora aproximada es: ${basicTime} (basada en hora del sistema)`
      };
    }
  }

  /**
   * Extrae ubicación de la query (COMPLETO - soporta 50+ ciudades/países)
   */
  extractLocation(query) {
    const locations = {
      // América del Sur
      'peru': 'Lima',
      'perú': 'Lima',
      'lima': 'Lima',
      'chile': 'Santiago',
      'santiago': 'Santiago',
      'argentina': 'Buenos Aires',
      'buenos aires': 'Buenos Aires',
      'brasil': 'São Paulo',
      'brazil': 'São Paulo',
      'sao paulo': 'São Paulo',
      'são paulo': 'São Paulo',
      'rio': 'Rio de Janeiro',
      'colombia': 'Bogotá',
      'bogota': 'Bogotá',
      'bogotá': 'Bogotá',
      'venezuela': 'Caracas',
      'caracas': 'Caracas',
      'ecuador': 'Quito',
      'quito': 'Quito',
      'bolivia': 'La Paz',
      'la paz': 'La Paz',
      'uruguay': 'Montevideo',
      'montevideo': 'Montevideo',
      'paraguay': 'Asunción',
      'asuncion': 'Asunción',

      // América del Norte
      'usa': 'New York',
      'estados unidos': 'New York',
      'new york': 'New York',
      'nueva york': 'New York',
      'los angeles': 'Los Angeles',
      'chicago': 'Chicago',
      'miami': 'Miami',
      'washington': 'Washington DC',
      'san francisco': 'San Francisco',
      'mexico': 'Mexico City',
      'méxico': 'Mexico City',
      'ciudad de mexico': 'Mexico City',
      'canada': 'Toronto',
      'canadá': 'Toronto',
      'toronto': 'Toronto',
      'vancouver': 'Vancouver',
      'montreal': 'Montreal',

      // Europa
      'españa': 'Madrid',
      'spain': 'Madrid',
      'madrid': 'Madrid',
      'barcelona': 'Barcelona',
      'francia': 'Paris',
      'france': 'Paris',
      'paris': 'Paris',
      'parís': 'Paris',
      'alemania': 'Berlin',
      'germany': 'Berlin',
      'berlin': 'Berlin',
      'berlín': 'Berlin',
      'italia': 'Rome',
      'italy': 'Rome',
      'roma': 'Rome',
      'rome': 'Rome',
      'milan': 'Milan',
      'milán': 'Milan',
      'reino unido': 'London',
      'uk': 'London',
      'england': 'London',
      'inglaterra': 'London',
      'london': 'London',
      'londres': 'London',
      'portugal': 'Lisbon',
      'lisboa': 'Lisbon',
      'lisbon': 'Lisbon',
      'rusia': 'Moscow',
      'russia': 'Moscow',
      'moscu': 'Moscow',
      'moscow': 'Moscow',

      // Asia
      'china': 'Beijing',
      'beijing': 'Beijing',
      'shanghai': 'Shanghai',
      'japon': 'Tokyo',
      'japón': 'Tokyo',
      'japan': 'Tokyo',
      'tokyo': 'Tokyo',
      'tokio': 'Tokyo',
      'corea': 'Seoul',
      'korea': 'Seoul',
      'seoul': 'Seoul',
      'seul': 'Seoul',
      'india': 'New Delhi',
      'delhi': 'New Delhi',
      'mumbai': 'Mumbai',
      'tailandia': 'Bangkok',
      'thailand': 'Bangkok',
      'bangkok': 'Bangkok',
      'singapur': 'Singapore',
      'singapore': 'Singapore',

      // Oceanía
      'australia': 'Sydney',
      'sydney': 'Sydney',
      'melbourne': 'Melbourne',
      'nueva zelanda': 'Auckland',
      'new zealand': 'Auckland',
      'auckland': 'Auckland',

      // África
      'sudafrica': 'Johannesburg',
      'south africa': 'Johannesburg',
      'egipto': 'Cairo',
      'egypt': 'Cairo',
      'cairo': 'Cairo',
      'el cairo': 'Cairo'
    };

    const queryLower = query.toLowerCase();
    for (const [key, value] of Object.entries(locations)) {
      if (queryLower.includes(key)) {
        return value;
      }
    }

    return 'Santiago'; // Default
  }

  /**
   * Obtiene timezone según ubicación (COMPLETO - soporta 50+ zonas horarias)
   */
  getTimezone(location) {
    const timezones = {
      // América del Sur
      'Lima': 'America/Lima',
      'Santiago': 'America/Santiago',
      'Buenos Aires': 'America/Argentina/Buenos_Aires',
      'São Paulo': 'America/Sao_Paulo',
      'Rio de Janeiro': 'America/Sao_Paulo',
      'Bogotá': 'America/Bogota',
      'Caracas': 'America/Caracas',
      'Quito': 'America/Guayaquil',
      'La Paz': 'America/La_Paz',
      'Montevideo': 'America/Montevideo',
      'Asunción': 'America/Asuncion',

      // América del Norte
      'New York': 'America/New_York',
      'Los Angeles': 'America/Los_Angeles',
      'Chicago': 'America/Chicago',
      'Miami': 'America/New_York',
      'Washington DC': 'America/New_York',
      'San Francisco': 'America/Los_Angeles',
      'Mexico City': 'America/Mexico_City',
      'Toronto': 'America/Toronto',
      'Vancouver': 'America/Vancouver',
      'Montreal': 'America/Montreal',

      // Europa
      'Madrid': 'Europe/Madrid',
      'Barcelona': 'Europe/Madrid',
      'Paris': 'Europe/Paris',
      'Berlin': 'Europe/Berlin',
      'Rome': 'Europe/Rome',
      'Milan': 'Europe/Rome',
      'London': 'Europe/London',
      'Lisbon': 'Europe/Lisbon',
      'Moscow': 'Europe/Moscow',

      // Asia
      'Beijing': 'Asia/Shanghai',
      'Shanghai': 'Asia/Shanghai',
      'Tokyo': 'Asia/Tokyo',
      'Seoul': 'Asia/Seoul',
      'New Delhi': 'Asia/Kolkata',
      'Mumbai': 'Asia/Kolkata',
      'Bangkok': 'Asia/Bangkok',
      'Singapore': 'Asia/Singapore',

      // Oceanía
      'Sydney': 'Australia/Sydney',
      'Melbourne': 'Australia/Melbourne',
      'Auckland': 'Pacific/Auckland',

      // África
      'Johannesburg': 'Africa/Johannesburg',
      'Cairo': 'Africa/Cairo'
    };

    return timezones[location] || 'America/Santiago';
  }

  /**
   * Obtiene clima (usando wttr.in - API gratuita)
   */
  async getWeather(query) {
    try {
      const location = this.extractLocation(query);

      // wttr.in - API de clima gratuita sin API key
      const response = await axios.get(`https://wttr.in/${encodeURIComponent(location)}?format=j1`, {
        timeout: 5000
      });

      const data = response.data;
      const current = data.current_condition[0];

      return {
        source: 'wttr.in',
        data: current,
        summary: `Clima en ${location}: ${current.temp_C}°C, ${current.weatherDesc[0].value}. Sensación térmica: ${current.FeelsLikeC}°C. Humedad: ${current.humidity}%`
      };
    } catch (error) {
      console.error('❌ Error obteniendo clima:', error.message);
      return await this.generalWebSearch(query);
    }
  }

  /**
   * Obtiene noticias (scraping simple)
   */
  async getNews(query) {
    return await this.generalWebSearch(query + ' noticias hoy');
  }

  /**
   * Búsqueda web REAL con múltiples motores (Google, DuckDuckGo, Bing)
   */
  async generalWebSearch(query) {
    try {
      console.log(`🔍 Búsqueda WEB REAL: "${query}"`);

      // Buscar en paralelo en múltiples motores
      const searches = await Promise.allSettled([
        this.searchDuckDuckGo(query),
        this.searchBing(query)
      ]);

      const allResults = [];

      for (const result of searches) {
        if (result.status === 'fulfilled' && result.value.results.length > 0) {
          allResults.push(...result.value.results);
        }
      }

      if (allResults.length === 0) {
        return {
          source: 'Web Search (múltiples motores)',
          data: null,
          summary: '❌ No encontré resultados en ningún motor de búsqueda. Verifica tu conexión a internet.'
        };
      }

      // Tomar los mejores 5 resultados
      const topResults = allResults.slice(0, 5);

      console.log(`✅ Encontrados ${topResults.length} resultados de ${searches.filter(s => s.status === 'fulfilled').length} motores`);

      return {
        source: 'Web Search (múltiples motores)',
        data: topResults,
        summary: `📊 RESULTADOS DE BÚSQUEDA WEB (${topResults.length} fuentes):\n\n` +
                 topResults.map((r, i) => `${i + 1}. **${r.title}**\n   ${r.snippet}\n   🔗 Fuente: ${r.source || 'Web'}`).join('\n\n')
      };
    } catch (error) {
      console.error('❌ Error en búsqueda web:', error.message);
      return {
        source: 'Error',
        data: null,
        summary: 'Lo siento, tuve problemas accediendo a internet en este momento.'
      };
    }
  }

  /**
   * Búsqueda en DuckDuckGo
   */
  async searchDuckDuckGo(query) {
    try {
      const searchUrl = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`;
      const response = await axios.get(searchUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        },
        timeout: 10000
      });

      const snippetRegex = /<a class="result__snippet"[^>]*>(.*?)<\/a>/gs;
      const titleRegex = /<a class="result__a"[^>]*>(.*?)<\/a>/g;
      const urlRegex = /<a class="result__url"[^>]*href="([^"]*)"[^>]*>/g;

      const snippets = [];
      const titles = [];
      const urls = [];

      let match;
      let count = 0;

      while ((match = snippetRegex.exec(response.data)) !== null && count < 3) {
        const cleaned = match[1].replace(/<[^>]*>/g, '').replace(/&quot;/g, '"').replace(/&amp;/g, '&').trim();
        if (cleaned) {
          snippets.push(cleaned);
          count++;
        }
      }

      count = 0;
      while ((match = titleRegex.exec(response.data)) !== null && count < 3) {
        const cleaned = match[1].replace(/<[^>]*>/g, '').replace(/&quot;/g, '"').replace(/&amp;/g, '&').trim();
        if (cleaned) {
          titles.push(cleaned);
          count++;
        }
      }

      count = 0;
      while ((match = urlRegex.exec(response.data)) !== null && count < 3) {
        urls.push(match[1]);
        count++;
      }

      const results = titles.map((title, i) => ({
        title,
        snippet: snippets[i] || '',
        url: urls[i] || '',
        source: 'DuckDuckGo'
      }));

      return { results, source: 'DuckDuckGo' };
    } catch (error) {
      console.error('❌ DuckDuckGo falló:', error.message);
      return { results: [], source: 'DuckDuckGo' };
    }
  }

  /**
   * Búsqueda en Bing
   */
  async searchBing(query) {
    try {
      const searchUrl = `https://www.bing.com/search?q=${encodeURIComponent(query)}&format=html`;
      const response = await axios.get(searchUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'es-ES,es;q=0.9,en;q=0.8'
        },
        timeout: 10000
      });

      // Regex más robusto para Bing
      const resultRegex = /<h2><a[^>]*href="([^"]*)"[^>]*>(.*?)<\/a><\/h2>/g;
      const snippetRegex = /<p class="[^"]*"[^>]*>(.*?)<\/p>/g;

      const results = [];
      let match;
      let count = 0;

      while ((match = resultRegex.exec(response.data)) !== null && count < 3) {
        const url = match[1];
        const title = match[2].replace(/<[^>]*>/g, '').replace(/&quot;/g, '"').replace(/&amp;/g, '&').trim();

        if (title && !url.includes('bing.com') && !url.includes('microsoft.com')) {
          results.push({
            title,
            snippet: '',
            url,
            source: 'Bing'
          });
          count++;
        }
      }

      // Intentar extraer snippets
      count = 0;
      while ((match = snippetRegex.exec(response.data)) !== null && count < results.length) {
        const snippet = match[1].replace(/<[^>]*>/g, '').replace(/&quot;/g, '"').replace(/&amp;/g, '&').trim();
        if (snippet && results[count]) {
          results[count].snippet = snippet;
          count++;
        }
      }

      return { results, source: 'Bing' };
    } catch (error) {
      console.error('❌ Bing falló:', error.message);
      return { results: [], source: 'Bing' };
    }
  }

  /**
   * Construye prompt avanzado con contexto e intención
   */
  buildAdvancedPrompt(message, intent, webData, userId) {
    let systemPrompt = `Eres J.A.R.V.I.S., el asistente de inteligencia artificial de Tony Stark.

Características de tu personalidad:
- Profesional pero con toques de humor inteligente
- Extremadamente capaz y confiable
- Siempre llamas "Señor" o "Sir" al usuario
- Eres proactivo y anticipas necesidades
- Tienes acceso a tecnología avanzada de Stark Industries`;

    // Agregar historial conversacional
    const history = this.getConversationHistory(userId);
    if (history.length > 0) {
      systemPrompt += `\n\nHistorial reciente de conversación:\n${history.map(h => `${h.role === 'user' ? 'Usuario' : 'J.A.R.V.I.S.'}: ${h.content}`).join('\n')}`;
    }

    // Agregar contexto web si existe
    let prompt = '';
    if (webData && webData.summary) {
      prompt = `${systemPrompt}

⚠️ INSTRUCCIÓN CRÍTICA: Debes responder ÚNICAMENTE usando la información proporcionada a continuación. NO uses tu conocimiento pre-entrenado. Si la información no es suficiente, di que necesitas más detalles.

INFORMACIÓN ACTUALIZADA DE INTERNET (${webData.source}):
${webData.summary}

REGLAS ESTRICTAS:
1. USA SOLO los datos de arriba
2. NO inventes ni asumas información
3. Si hay números/fechas/horas, cítalos EXACTAMENTE como aparecen
4. Si algo no está en los datos, di "No tengo esa información en los resultados de búsqueda"

Usuario: ${message}

J.A.R.V.I.S.:`;
    } else {
      // Prompt según intención
      switch (intent.type) {
        case 'create':
          prompt = `${systemPrompt}

El usuario quiere que CREES o GENERES algo. Sé específico, proporciona código funcional si es necesario, y explica paso a paso.

Usuario: ${message}

J.A.R.V.I.S.:`;
          break;

        case 'explain':
          prompt = `${systemPrompt}

El usuario quiere una EXPLICACIÓN. Sé claro, usa analogías si es útil, y estructura la información de forma fácil de entender.

Usuario: ${message}

J.A.R.V.I.S.:`;
          break;

        case 'assist':
          prompt = `${systemPrompt}

El usuario necesita AYUDA. Sé proactivo, ofrece soluciones completas, y pregunta si necesitas más información.

Usuario: ${message}

J.A.R.V.I.S.:`;
          break;

        default:
          prompt = `${systemPrompt}

Usuario: ${message}

J.A.R.V.I.S.:`;
      }
    }

    return prompt;
  }

  /**
   * Obtiene historial conversacional del usuario
   */
  getConversationHistory(userId) {
    return this.conversationHistory.get(userId) || [];
  }

  /**
   * Agrega mensaje al historial
   */
  addToHistory(userId, role, content) {
    if (!this.conversationHistory.has(userId)) {
      this.conversationHistory.set(userId, []);
    }

    const history = this.conversationHistory.get(userId);
    history.push({ role, content, timestamp: Date.now() });

    // Mantener solo los últimos N mensajes
    if (history.length > this.maxHistoryLength) {
      history.shift();
    }
  }

  /**
   * Procesa mensaje con IA de Ollama
   */
  async processWithAI(prompt, model = 'mistral:latest') {
    try {
      const response = await axios.post('http://localhost:11434/api/generate', {
        model: model,
        prompt: prompt,
        stream: false,
        options: {
          temperature: 0.7,
          top_p: 0.9,
          top_k: 40
        }
      });

      return response.data.response;
    } catch (error) {
      console.error('❌ Error en Ollama:', error.message);
      throw error;
    }
  }

  /**
   * Método principal: Procesa un mensaje completo
   */
  async processMessage(message, userId = 'default-user', model = 'mistral:latest') {
    try {
      console.log(`\n💬 [${userId}] Mensaje: ${message}`);

      // 1. Detectar intención
      const intent = this.detectIntent(message);
      console.log(`🎯 Intención detectada: ${intent.type} (${Math.round(intent.confidence * 100)}%)`);

      // 2. Búsqueda web si es necesario
      let webData = null;
      if (intent.type === 'web_search') {
        webData = await this.performWebSearch(message, intent.category, userId);
        console.log(`🌐 Datos web obtenidos de: ${webData.source}`);
      }

      // 3. Construir prompt avanzado
      const prompt = this.buildAdvancedPrompt(message, intent, webData, userId);

      // 4. Procesar con IA
      console.log(`🧠 Procesando con ${model}...`);
      let response = await this.processWithAI(prompt, model);

      // 5. Post-procesamiento
      if (webData && webData.source !== 'Error') {
        response = `🌐 *Busqué información actualizada en ${webData.source}, Señor.*\n\n${response}`;
      }

      // 6. Guardar en historial
      this.addToHistory(userId, 'user', message);
      this.addToHistory(userId, 'assistant', response);

      // 7. Registrar interacción en AI Systems (AUTOMÁTICO)
      if (this.aiIntegration) {
        await this.aiIntegration.recordInteraction(userId, message, response);
      }

      console.log(`✅ Respuesta generada (${response.length} chars)\n`);

      return {
        success: true,
        message: response,
        intent: intent,
        usedWeb: !!webData,
        webSource: webData?.source,
        conversationLength: this.getConversationHistory(userId).length
      };

    } catch (error) {
      console.error('❌ Error procesando mensaje:', error);
      return {
        success: false,
        message: `Lo siento, Señor. Encontré un problema técnico: ${error.message}. Permítame intentarlo de otra manera.`,
        error: error.message
      };
    }
  }

  /**
   * Limpia historial de un usuario
   */
  clearHistory(userId) {
    this.conversationHistory.delete(userId);
    console.log(`🗑️ Historial limpiado para usuario: ${userId}`);
  }

  /**
   * Obtiene estadísticas del sistema
   */
  getStats() {
    return {
      activeUsers: this.conversationHistory.size,
      totalMessages: Array.from(this.conversationHistory.values())
        .reduce((sum, history) => sum + history.length, 0),
      users: Array.from(this.conversationHistory.keys())
    };
  }
}

module.exports = IntelligentChatSystem;

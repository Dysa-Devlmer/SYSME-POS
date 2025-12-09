// web-search.cjs
// Motor de búsqueda web para JARVIS
// Usa DuckDuckGo HTML (sin API key necesaria)

const axios = require('axios');

class WebSearch {
  constructor() {
    this.userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
  }

  /**
   * Realiza búsqueda en DuckDuckGo
   * @param {string} query - Término de búsqueda
   * @param {number} maxResults - Número máximo de resultados (default: 5)
   * @returns {Promise<Object>}
   */
  async search(query, maxResults = 5) {
    try {
      console.log(`🔍 Buscando en web: "${query}"`);

      // DuckDuckGo Instant Answer API (gratuita, sin API key)
      const instantAnswerUrl = `https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json&no_html=1&skip_disambig=1`;

      const response = await axios.get(instantAnswerUrl, {
        headers: {
          'User-Agent': this.userAgent
        },
        timeout: 10000
      });

      const data = response.data;

      // Procesar resultados
      const results = {
        query: query,
        timestamp: new Date().toISOString(),
        abstractText: data.AbstractText || null,
        abstractSource: data.AbstractSource || null,
        abstractUrl: data.AbstractURL || null,
        definition: data.Definition || null,
        definitionSource: data.DefinitionSource || null,
        definitionUrl: data.DefinitionURL || null,
        relatedTopics: this.extractRelatedTopics(data.RelatedTopics, maxResults),
        answer: data.Answer || null,
        answerType: data.AnswerType || null,
        heading: data.Heading || null,
        image: data.Image || null,
        infobox: this.extractInfobox(data.Infobox)
      };

      console.log(`✅ Búsqueda completada: ${results.relatedTopics.length} temas relacionados encontrados`);

      return results;

    } catch (error) {
      console.error('❌ Error en búsqueda web:', error.message);

      return {
        query: query,
        timestamp: new Date().toISOString(),
        error: error.message,
        fallback: this.getFallbackMessage(query)
      };
    }
  }

  /**
   * Extrae temas relacionados de la respuesta
   */
  extractRelatedTopics(relatedTopics, maxResults) {
    if (!relatedTopics || !Array.isArray(relatedTopics)) {
      return [];
    }

    const topics = [];

    for (const topic of relatedTopics) {
      if (topics.length >= maxResults) break;

      // Algunos tópicos son categorías con sub-topics
      if (topic.Topics && Array.isArray(topic.Topics)) {
        for (const subTopic of topic.Topics) {
          if (topics.length >= maxResults) break;

          if (subTopic.Text && subTopic.FirstURL) {
            topics.push({
              text: subTopic.Text,
              url: subTopic.FirstURL,
              icon: subTopic.Icon?.URL || null
            });
          }
        }
      }
      // Otros tópicos son directos
      else if (topic.Text && topic.FirstURL) {
        topics.push({
          text: topic.Text,
          url: topic.FirstURL,
          icon: topic.Icon?.URL || null
        });
      }
    }

    return topics;
  }

  /**
   * Extrae información del Infobox
   */
  extractInfobox(infobox) {
    if (!infobox) return null;

    return {
      content: infobox.content || [],
      meta: infobox.meta || [],
      imageUrl: infobox.meta?.find(m => m.label === 'Image')?.value || null
    };
  }

  /**
   * Mensaje de fallback cuando la búsqueda falla
   */
  getFallbackMessage(query) {
    return `No pude realizar la búsqueda en este momento, Señor.

**Alternativas:**
1. Intente reformular la búsqueda
2. Busque directamente en: https://duckduckgo.com/?q=${encodeURIComponent(query)}
3. Use Google: https://www.google.com/search?q=${encodeURIComponent(query)}

El sistema de búsqueda puede tener limitaciones temporales. Como siempre, listo para intentarlo nuevamente. ⚡`;
  }

  /**
   * Formatea resultados para respuesta de JARVIS
   */
  formatResults(searchResults) {
    if (searchResults.error) {
      return searchResults.fallback;
    }

    let response = `🔍 **Búsqueda: "${searchResults.query}"**\n\n`;

    // Abstract/Definición principal
    if (searchResults.abstractText) {
      response += `📄 **Resumen:**\n${searchResults.abstractText}\n`;
      if (searchResults.abstractSource) {
        response += `   → Fuente: ${searchResults.abstractSource}\n`;
      }
      if (searchResults.abstractUrl) {
        response += `   → Más info: ${searchResults.abstractUrl}\n`;
      }
      response += `\n`;
    }

    // Definición
    if (searchResults.definition) {
      response += `📖 **Definición:**\n${searchResults.definition}\n`;
      if (searchResults.definitionSource) {
        response += `   → Fuente: ${searchResults.definitionSource}\n`;
      }
      response += `\n`;
    }

    // Respuesta directa
    if (searchResults.answer) {
      response += `💡 **Respuesta Directa:**\n${searchResults.answer}\n\n`;
    }

    // Temas relacionados
    if (searchResults.relatedTopics && searchResults.relatedTopics.length > 0) {
      response += `📚 **Temas Relacionados:**\n\n`;
      searchResults.relatedTopics.forEach((topic, index) => {
        response += `${index + 1}. ${topic.text}\n`;
        response += `   → ${topic.url}\n\n`;
      });
    }

    // Si no hay resultados útiles
    if (!searchResults.abstractText &&
        !searchResults.definition &&
        !searchResults.answer &&
        searchResults.relatedTopics.length === 0) {
      response += `No encontré resultados específicos para "${searchResults.query}", Señor.\n\n`;
      response += `**Sugerencias:**\n`;
      response += `• Intente con términos más específicos\n`;
      response += `• Busque directamente: https://duckduckgo.com/?q=${encodeURIComponent(searchResults.query)}\n\n`;
    }

    response += `Como siempre, Señor. ⚡🎩`;

    return response;
  }

  /**
   * Búsqueda rápida con formato automático
   */
  async quickSearch(query, maxResults = 5) {
    const results = await this.search(query, maxResults);
    return this.formatResults(results);
  }
}

module.exports = WebSearch;

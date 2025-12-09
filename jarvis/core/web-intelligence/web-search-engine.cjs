// core/web-intelligence/web-search-engine.cjs
// Motor de búsqueda inteligente - JARVIS puede buscar cualquier cosa en internet

const axios = require('axios');
const cheerio = require('cheerio');
const { EventEmitter } = require('events');

/**
 * Web Search Engine
 *
 * Capacidades:
 * - Búsqueda multi-fuente (Google, Stack Overflow, GitHub, MDN)
 * - Extracción inteligente de contenido
 * - Ranking de resultados por relevancia
 * - Cache de búsquedas
 */
class WebSearchEngine extends EventEmitter {
  constructor(options = {}) {
    super();

    this.userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36';
    this.timeout = options.timeout || 10000;
    this.maxResults = options.maxResults || 10;
    this.cache = new Map();
    this.cacheTTL = options.cacheTTL || 3600000; // 1 hora

    // Fuentes de búsqueda
    this.sources = {
      google: true,
      stackoverflow: true,
      github: true,
      mdn: true,
      ...options.sources
    };
  }

  /**
   * Busca en múltiples fuentes
   */
  async search(query, options = {}) {
    const cacheKey = `search:${query}`;

    // Verificar cache
    if (this.cache.has(cacheKey)) {
      const cached = this.cache.get(cacheKey);
      if (Date.now() - cached.timestamp < this.cacheTTL) {
        console.log(`📦 [Web Search] Cache hit: ${query}`);
        return cached.results;
      }
    }

    console.log(`🔍 [Web Search] Buscando: "${query}"`);
    this.emit('search:start', { query });

    const results = [];
    const searchPromises = [];

    // Buscar en todas las fuentes habilitadas
    if (this.sources.google) {
      searchPromises.push(this.searchGoogle(query).catch(err => {
        console.error('❌ [Google] Error:', err.message);
        return [];
      }));
    }

    if (this.sources.stackoverflow) {
      searchPromises.push(this.searchStackOverflow(query).catch(err => {
        console.error('❌ [Stack Overflow] Error:', err.message);
        return [];
      }));
    }

    if (this.sources.github) {
      searchPromises.push(this.searchGitHub(query).catch(err => {
        console.error('❌ [GitHub] Error:', err.message);
        return [];
      }));
    }

    if (this.sources.mdn) {
      searchPromises.push(this.searchMDN(query).catch(err => {
        console.error('❌ [MDN] Error:', err.message);
        return [];
      }));
    }

    // Ejecutar búsquedas en paralelo
    const allResults = await Promise.all(searchPromises);

    // Combinar y rankear resultados
    for (const sourceResults of allResults) {
      results.push(...sourceResults);
    }

    // Rankear por relevancia
    const rankedResults = this.rankResults(results, query);

    // Guardar en cache
    this.cache.set(cacheKey, {
      results: rankedResults,
      timestamp: Date.now()
    });

    console.log(`✅ [Web Search] ${rankedResults.length} resultados encontrados`);
    this.emit('search:complete', { query, count: rankedResults.length });

    return rankedResults.slice(0, this.maxResults);
  }

  /**
   * Busca en Google (scraping)
   */
  async searchGoogle(query) {
    try {
      const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(query)}`;

      const response = await axios.get(searchUrl, {
        headers: { 'User-Agent': this.userAgent },
        timeout: this.timeout
      });

      const $ = cheerio.load(response.data);
      const results = [];

      // Extraer resultados de búsqueda
      $('.g').each((i, elem) => {
        const title = $(elem).find('h3').text();
        const url = $(elem).find('a').attr('href');
        const snippet = $(elem).find('.VwiC3b').text() || $(elem).find('.s').text();

        if (title && url) {
          results.push({
            source: 'google',
            title,
            url,
            snippet,
            relevance: 1.0 - (i * 0.05) // Decrementa con posición
          });
        }
      });

      console.log(`📊 [Google] ${results.length} resultados`);
      return results;
    } catch (error) {
      console.error('❌ [Google] Error:', error.message);
      return [];
    }
  }

  /**
   * Busca en Stack Overflow (API)
   */
  async searchStackOverflow(query) {
    try {
      const apiUrl = 'https://api.stackexchange.com/2.3/search/advanced';
      const params = {
        order: 'desc',
        sort: 'relevance',
        q: query,
        site: 'stackoverflow',
        filter: 'withbody'
      };

      const response = await axios.get(apiUrl, {
        params,
        timeout: this.timeout
      });

      const results = response.data.items.map((item, i) => ({
        source: 'stackoverflow',
        title: item.title,
        url: item.link,
        snippet: this.stripHtml(item.body).substring(0, 300),
        score: item.score,
        isAnswered: item.is_answered,
        answerCount: item.answer_count,
        relevance: item.is_answered ? 1.0 : 0.7
      }));

      console.log(`📊 [Stack Overflow] ${results.length} resultados`);
      return results;
    } catch (error) {
      console.error('❌ [Stack Overflow] Error:', error.message);
      return [];
    }
  }

  /**
   * Busca en GitHub (API)
   */
  async searchGitHub(query) {
    try {
      const apiUrl = 'https://api.github.com/search/repositories';
      const params = {
        q: query,
        sort: 'stars',
        order: 'desc',
        per_page: 5
      };

      const response = await axios.get(apiUrl, {
        params,
        headers: {
          'Accept': 'application/vnd.github.v3+json',
          'User-Agent': this.userAgent
        },
        timeout: this.timeout
      });

      const results = response.data.items.map((item, i) => ({
        source: 'github',
        title: item.full_name,
        url: item.html_url,
        snippet: item.description || 'No description',
        stars: item.stargazers_count,
        language: item.language,
        relevance: 0.9 - (i * 0.05)
      }));

      console.log(`📊 [GitHub] ${results.length} resultados`);
      return results;
    } catch (error) {
      console.error('❌ [GitHub] Error:', error.message);
      return [];
    }
  }

  /**
   * Busca en MDN (scraping)
   */
  async searchMDN(query) {
    try {
      const searchUrl = `https://developer.mozilla.org/en-US/search?q=${encodeURIComponent(query)}`;

      const response = await axios.get(searchUrl, {
        headers: { 'User-Agent': this.userAgent },
        timeout: this.timeout
      });

      const $ = cheerio.load(response.data);
      const results = [];

      // Extraer resultados
      $('.result-item').each((i, elem) => {
        const title = $(elem).find('.result-title').text().trim();
        const url = 'https://developer.mozilla.org' + $(elem).find('a').attr('href');
        const snippet = $(elem).find('.result-description').text().trim();

        if (title && url) {
          results.push({
            source: 'mdn',
            title,
            url,
            snippet,
            relevance: 1.0 // MDN siempre alta relevancia para docs
          });
        }
      });

      console.log(`📊 [MDN] ${results.length} resultados`);
      return results;
    } catch (error) {
      console.error('❌ [MDN] Error:', error.message);
      return [];
    }
  }

  /**
   * Rankea resultados por relevancia
   */
  rankResults(results, query) {
    const queryLower = query.toLowerCase();
    const queryWords = queryLower.split(' ');

    return results
      .map(result => {
        let score = result.relevance || 0.5;

        // Boost si el título contiene palabras de la query
        const titleLower = result.title.toLowerCase();
        const titleMatches = queryWords.filter(word => titleLower.includes(word)).length;
        score += titleMatches * 0.1;

        // Boost por fuente
        if (result.source === 'mdn') score += 0.2; // MDN es muy confiable
        if (result.source === 'stackoverflow' && result.isAnswered) score += 0.15;
        if (result.source === 'github' && result.stars > 1000) score += 0.1;

        return { ...result, finalScore: score };
      })
      .sort((a, b) => b.finalScore - a.finalScore);
  }

  /**
   * Limpia HTML
   */
  stripHtml(html) {
    return html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
  }

  /**
   * Limpia cache
   */
  clearCache() {
    this.cache.clear();
    console.log('🧹 [Web Search] Cache limpiado');
  }
}

module.exports = WebSearchEngine;

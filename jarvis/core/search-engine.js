// ============================================
// SEARCH ENGINE - BÚSQUEDA INTELIGENTE
// ============================================
// Motor de búsqueda web y local con caché

import axios from 'axios';
import * as cheerio from 'cheerio';
import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class SearchEngine {
  constructor(logger) {
    this.logger = logger || console;
    this.cacheDir = path.join(__dirname, '../data/search-cache');
    this.resultsCache = new Map();
  }

  async initialize() {
    await fs.ensureDir(this.cacheDir);
    this.logger.info('✅ SearchEngine inicializado');
  }

  // ===== BÚSQUEDA WEB (DuckDuckGo HTML) =====
  async searchWeb(query, limit = 5) {
    try {
      // Verificar cache (TTL: 30 min)
      const cacheKey = `web_${query}`;
      if (this.resultsCache.has(cacheKey)) {
        const cached = this.resultsCache.get(cacheKey);
        if (Date.now() - cached.timestamp < 30 * 60 * 1000) {
          this.logger.info(`📦 Resultados en cache para: ${query}`);
          return { success: true, data: cached.results };
        }
      }

      this.logger.info(`🔍 Buscando en web: "${query}"`);

      const encoded = encodeURIComponent(query);
      const url = `https://html.duckduckgo.com/html/?q=${encoded}`;

      const response = await axios.get(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        },
        timeout: 10000
      });

      const $ = cheerio.load(response.data);
      const results = [];

      $('.result').slice(0, limit).each((i, el) => {
        const $el = $(el);
        const title = $el.find('.result__title').text().trim();
        const link = $el.find('.result__url').attr('href') || $el.find('.result__a').attr('href');
        const snippet = $el.find('.result__snippet').text().trim();

        if (title && link) {
          results.push({
            title: title,
            url: link.startsWith('http') ? link : `https://${link}`,
            description: snippet || 'Sin descripción disponible',
            source: 'DuckDuckGo',
            relevance: 1.0 - (i * 0.1)
          });
        }
      });

      // Guardar en cache
      this.resultsCache.set(cacheKey, {
        results: results,
        timestamp: Date.now()
      });

      this.logger.info(`✅ Encontrados ${results.length} resultados`);
      return { success: true, data: results, count: results.length };

    } catch (error) {
      this.logger.error('Error en búsqueda web:', error.message);
      return { success: false, data: [], message: error.message };
    }
  }

  // ===== BÚSQUEDA LOCAL =====
  async searchLocal(query, limit = 5) {
    try {
      this.logger.info(`🔎 Buscando localmente: "${query}"`);

      const projectsDir = path.join(__dirname, '../projects');
      const memoryDb = path.join(__dirname, '../data/memory-db.json');
      const tasksDb = path.join(__dirname, '../data/tasks.json');

      let results = [];

      // Buscar en memoria
      if (await fs.pathExists(memoryDb)) {
        const memory = await fs.readJSON(memoryDb);
        (memory.memories || []).forEach((mem, i) => {
          if (this.matchesQuery(mem.content, query)) {
            results.push({
              title: mem.content.substring(0, 60) + '...',
              url: `memory://${mem.id}`,
              description: mem.content,
              source: 'Memoria Local',
              type: 'memory',
              relevance: 0.9 - (i * 0.05)
            });
          }
        });
      }

      // Buscar en tareas
      if (await fs.pathExists(tasksDb)) {
        const tasks = await fs.readJSON(tasksDb);
        (tasks.tasks || []).forEach((task, i) => {
          if (this.matchesQuery(task.description, query)) {
            results.push({
              title: `Tarea: ${task.description}`,
              url: `task://${task.id}`,
              description: task.description,
              source: 'Tareas',
              type: 'task',
              relevance: 0.85 - (i * 0.05)
            });
          }
        });
      }

      // Buscar en proyectos
      if (await fs.pathExists(projectsDir)) {
        const projects = await fs.readdir(projectsDir);

        for (const proj of projects.slice(0, 10)) {
          const readmePath = path.join(projectsDir, proj, 'README.md');
          if (await fs.pathExists(readmePath)) {
            const content = await fs.readFile(readmePath, 'utf-8');
            if (this.matchesQuery(content, query) || this.matchesQuery(proj, query)) {
              results.push({
                title: `Proyecto: ${proj}`,
                url: `project://${proj}`,
                description: content.substring(0, 150) + '...',
                source: 'Proyectos Locales',
                type: 'project',
                relevance: 0.8
              });
            }
          }
        }
      }

      // Ordenar y limitar
      results = results
        .sort((a, b) => b.relevance - a.relevance)
        .slice(0, limit);

      this.logger.info(`✅ Encontrados ${results.length} resultados locales`);
      return { success: true, data: results, count: results.length };

    } catch (error) {
      this.logger.error('Error en búsqueda local:', error.message);
      return { success: false, data: [], message: error.message };
    }
  }

  // ===== RESUMEN DE URL =====
  async summarizeUrl(url) {
    try {
      this.logger.info(`📄 Resumiendo: ${url}`);

      const response = await axios.get(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0'
        },
        timeout: 10000
      });

      const $ = cheerio.load(response.data);

      const title = $('h1').first().text() || $('title').text() || 'Sin título';
      const paragraphs = [];

      $('p').slice(0, 5).each((i, el) => {
        const text = $(el).text().trim();
        if (text.length > 20) {
          paragraphs.push(text);
        }
      });

      const content = paragraphs.join(' ');
      const summary = content.length > 200
        ? content.substring(0, 200) + '...'
        : content;

      return {
        success: true,
        title: title.trim(),
        url: url,
        summary: summary,
        paragraphs: paragraphs.length
      };

    } catch (error) {
      this.logger.warn(`⚠️  Error resumiendo URL: ${error.message}`);
      return {
        success: false,
        title: 'Error',
        url: url,
        summary: 'No se pudo acceder a la URL o extraer contenido',
        paragraphs: 0
      };
    }
  }

  // ===== UTILIDADES =====
  matchesQuery(text, query) {
    const queryTerms = query.toLowerCase().split(' ');
    const textLower = text.toLowerCase();
    return queryTerms.some(term => textLower.includes(term));
  }

  async getStats() {
    return {
      cached_results: this.resultsCache.size,
      cache_dir: this.cacheDir,
      timestamp: new Date().toISOString()
    };
  }
}

export default SearchEngine;

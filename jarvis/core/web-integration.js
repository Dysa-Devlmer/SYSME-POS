/**
 * MÓDULO 4: WEB INTEGRATION
 * Búsqueda web, navegación, scraping, APIs integradas
 */

import fetch from 'node-fetch';
import * as cheerio from 'cheerio';

class WebIntegration {
  constructor(apiKeys = {}) {
    this.apiKeys = apiKeys;
    this.searchHistory = [];
    this.bookmarks = [];
    this.browserActive = false;
    
    console.log('🌐 Web Integration inicializando...');
  }

  /**
   * BUSCA EN INTERNET
   */
  async searchInternet(query) {
    try {
      // Usando DuckDuckGo API (sin API key requerida)
      const url = `https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json`;
      
      const response = await fetch(url);
      const data = await response.json();

      this.searchHistory.push({
        query,
        timestamp: new Date(),
        results: data.RelatedTopics?.length || 0
      });

      return {
        success: true,
        query,
        results: data.RelatedTopics?.slice(0, 5).map(r => ({
          title: r.Text,
          url: r.FirstURL
        })) || []
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * OBTIENE CLIMA EN TIEMPO REAL
   */
  async getWeather(location) {
    try {
      // Usando Open-Meteo API (gratis, sin key)
      const geoResponse = await fetch(
        `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(location)}&count=1`
      );
      const geoData = await geoResponse.json();

      if (!geoData.results || geoData.results.length === 0) {
        throw new Error('Ubicación no encontrada');
      }

      const { latitude, longitude, name, country } = geoData.results[0];

      const weatherResponse = await fetch(
        `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,weather_code,relative_humidity_2m,wind_speed_10m`
      );
      const weatherData = await weatherResponse.json();

      const current = weatherData.current;

      return {
        success: true,
        location: `${name}, ${country}`,
        temperature: `${current.temperature_2m}°C`,
        humidity: `${current.relative_humidity_2m}%`,
        windSpeed: `${current.wind_speed_10m} km/h`,
        weatherCode: current.weather_code,
        description: this.getWeatherDescription(current.weather_code)
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * OBTIENE NOTICIAS
   */
  async getNews(category = 'general') {
    try {
      // Usando NewsAPI (requiere key gratuita)
      const url = `https://newsapi.org/v2/top-headlines?category=${category}&language=es&pageSize=5`;
      
      const response = await fetch(url, {
        headers: { 'Authorization': `Bearer ${this.apiKeys.newsapi || ''}` }
      });

      if (!response.ok) {
        throw new Error('API key de NewsAPI no configurada o inválida');
      }

      const data = await response.json();

      return {
        success: true,
        category,
        articles: data.articles.map(article => ({
          title: article.title,
          description: article.description,
          url: article.url,
          publishedAt: article.publishedAt
        }))
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * ABRE URL EN NAVEGADOR
   */
  async openURL(url) {
    try {
      if (!url.startsWith('http')) {
        url = `https://${url}`;
      }

      const { exec } = await import('child_process');
      const { promisify } = await import('util');
      const execAsync = promisify(exec);

      let command = '';
      const platform = process.platform;

      if (platform === 'win32') {
        command = `start ${url}`;
      } else if (platform === 'darwin') {
        command = `open "${url}"`;
      } else {
        command = `xdg-open "${url}"`;
      }

      await execAsync(command);
      
      this.browserActive = true;
      console.log(`✅ URL abierta: ${url}`);
      return { success: true, url };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * WEB SCRAPING BÁSICO
   */
  async scrapeWebsite(url, selector) {
    try {
      const response = await fetch(url);
      const html = await response.text();
      const $ = cheerio.load(html);

      const data = $(selector)
        .map((_, el) => $(el).text())
        .get()
        .slice(0, 10);

      return {
        success: true,
        url,
        selector,
        data
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * DESCARGA ARCHIVO DESDE INTERNET
   */
  async downloadFile(url, filename) {
    try {
      const fs = await import('fs');
      const path = await import('path');
      
      const response = await fetch(url);
      const buffer = await response.buffer();

      const downloadPath = path.join(process.cwd(), 'downloads', filename);
      fs.mkdirSync(path.dirname(downloadPath), { recursive: true });
      fs.writeFileSync(downloadPath, buffer);

      console.log(`✅ Archivo descargado: ${filename}`);
      return { success: true, filename, path: downloadPath };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * AGREGA BOOKMARK
   */
  addBookmark(title, url) {
    const bookmark = {
      id: Date.now(),
      title,
      url,
      createdAt: new Date()
    };

    this.bookmarks.push(bookmark);
    console.log(`✅ Bookmark guardado: ${title}`);
    return { success: true, bookmark };
  }

  /**
   * OBTIENE BOOKMARKS
   */
  getBookmarks() {
    return {
      total: this.bookmarks.length,
      bookmarks: this.bookmarks
    };
  }

  /**
   * OBTIENE HISTORIAL DE BÚSQUEDAS
   */
  getSearchHistory(limit = 10) {
    return {
      total: this.searchHistory.length,
      recent: this.searchHistory.slice(-limit).reverse()
    };
  }

  /**
   * HELPER: Descripción del clima
   */
  getWeatherDescription(code) {
    const weatherCodes = {
      0: 'Cielo despejado',
      1: 'Mayormente despejado',
      2: 'Parcialmente nublado',
      3: 'Nublado',
      45: 'Niebla',
      48: 'Niebla con escarcha',
      51: 'Llovizna ligera',
      53: 'Llovizna moderada',
      55: 'Llovizna densa',
      61: 'Lluvia ligera',
      63: 'Lluvia moderada',
      65: 'Lluvia fuerte',
      80: 'Lluvia ligera con chubascos',
      81: 'Lluvia con chubascos',
      82: 'Lluvia fuerte con chubascos',
      85: 'Chubasco de nieve ligero',
      86: 'Chubasco de nieve fuerte',
      95: 'Tormenta',
      96: 'Tormenta con granizo ligero',
      99: 'Tormenta con granizo fuerte'
    };

    return weatherCodes[code] || 'Clima desconocido';
  }

  /**
   * OBTIENE INFORMACIÓN DE Stock
   */
  async getStockPrice(symbol) {
    try {
      // Usando Alpha Vantage API (requiere key gratuita)
      const url = `https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=${symbol}&apikey=${this.apiKeys.alphavantage || ''}`;
      
      const response = await fetch(url);
      const data = await response.json();

      if (data['Global Quote'] && data['Global Quote']['01. symbol']) {
        return {
          success: true,
          symbol,
          price: data['Global Quote']['05. price'],
          change: data['Global Quote']['09. change'],
          changePercent: data['Global Quote']['10. change percent']
        };
      } else {
        throw new Error('Stock no encontrado');
      }
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * TRADUCE TEXTO
   */
  async translateText(text, targetLanguage = 'es') {
    try {
      // Usando Google Translate API (gratuito vía librería)
      // En producción, usar librería 'google-translate-api'
      
      // Por ahora, retornar placeholder
      return {
        success: true,
        original: text,
        translated: text,
        targetLanguage
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }
}

export default WebIntegration;

// core/web-intelligence/content-extractor.cjs
// Extractor inteligente de contenido - JARVIS aprende de lo que encuentra

const axios = require('axios');
const cheerio = require('cheerio');
const { EventEmitter } = require('events');

/**
 * Content Extractor
 *
 * Extrae contenido útil de páginas web:
 * - Código fuente
 * - Documentación
 * - Tutoriales
 * - Ejemplos
 */
class ContentExtractor extends EventEmitter {
  constructor(options = {}) {
    super();

    this.userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36';
    this.timeout = options.timeout || 15000;
    this.maxContentLength = options.maxContentLength || 50000; // 50KB
  }

  /**
   * Extrae contenido de una URL
   */
  async extract(url) {
    console.log(`📄 [Content Extractor] Extrayendo: ${url}`);
    this.emit('extract:start', { url });

    try {
      // Detectar tipo de fuente
      const source = this.detectSource(url);

      let content;
      switch (source) {
        case 'github':
          content = await this.extractGitHub(url);
          break;
        case 'stackoverflow':
          content = await this.extractStackOverflow(url);
          break;
        case 'mdn':
          content = await this.extractMDN(url);
          break;
        default:
          content = await this.extractGeneric(url);
      }

      console.log(`✅ [Content Extractor] Extraído: ${content.text?.length || 0} caracteres`);
      this.emit('extract:complete', { url, length: content.text?.length });

      return content;
    } catch (error) {
      console.error(`❌ [Content Extractor] Error: ${error.message}`);
      this.emit('extract:error', { url, error: error.message });
      return { error: error.message, url };
    }
  }

  /**
   * Detecta fuente de la URL
   */
  detectSource(url) {
    if (url.includes('github.com')) return 'github';
    if (url.includes('stackoverflow.com')) return 'stackoverflow';
    if (url.includes('developer.mozilla.org')) return 'mdn';
    return 'generic';
  }

  /**
   * Extrae código de GitHub
   */
  async extractGitHub(url) {
    const response = await axios.get(url, {
      headers: { 'User-Agent': this.userAgent },
      timeout: this.timeout
    });

    const $ = cheerio.load(response.data);

    // Extraer README
    const readme = $('.markdown-body').text() || '';

    // Extraer archivos de código
    const codeFiles = [];
    $('.js-navigation-item').each((i, elem) => {
      const filename = $(elem).find('.js-navigation-open').text().trim();
      const link = $(elem).find('a').attr('href');

      if (filename && this.isCodeFile(filename)) {
        codeFiles.push({
          filename,
          url: 'https://github.com' + link
        });
      }
    });

    // Extraer descripción del repo
    const description = $('[data-pjax="#repo-content-pjax-container"] p').first().text().trim();

    return {
      type: 'github',
      url,
      title: $('h1 strong a').text().trim(),
      description,
      readme: readme.substring(0, this.maxContentLength),
      codeFiles: codeFiles.slice(0, 5),
      text: `${description}\n\n${readme}`.substring(0, this.maxContentLength)
    };
  }

  /**
   * Extrae respuesta de Stack Overflow
   */
  async extractStackOverflow(url) {
    const response = await axios.get(url, {
      headers: { 'User-Agent': this.userAgent },
      timeout: this.timeout
    });

    const $ = cheerio.load(response.data);

    // Extraer pregunta
    const question = {
      title: $('#question-header h1').text().trim(),
      body: $('.js-post-body').first().text().trim(),
      code: []
    };

    // Extraer código de la pregunta
    $('.js-post-body').first().find('pre code').each((i, elem) => {
      question.code.push($(elem).text().trim());
    });

    // Extraer respuesta aceptada
    const acceptedAnswer = $('.accepted-answer .js-post-body').text().trim();
    const acceptedAnswerCode = [];

    $('.accepted-answer .js-post-body pre code').each((i, elem) => {
      acceptedAnswerCode.push($(elem).text().trim());
    });

    return {
      type: 'stackoverflow',
      url,
      title: question.title,
      question: question.body,
      questionCode: question.code,
      answer: acceptedAnswer,
      answerCode: acceptedAnswerCode,
      text: `${question.title}\n\n${question.body}\n\nRespuesta:\n${acceptedAnswer}`.substring(0, this.maxContentLength)
    };
  }

  /**
   * Extrae documentación de MDN
   */
  async extractMDN(url) {
    const response = await axios.get(url, {
      headers: { 'User-Agent': this.userAgent },
      timeout: this.timeout
    });

    const $ = cheerio.load(response.data);

    // Extraer contenido principal
    const title = $('h1').first().text().trim();
    const description = $('.summary').text().trim() || $('p').first().text().trim();

    // Extraer secciones
    const sections = [];
    $('article section').each((i, elem) => {
      const sectionTitle = $(elem).find('h2, h3').first().text().trim();
      const sectionContent = $(elem).text().trim();

      if (sectionTitle && sectionContent) {
        sections.push({
          title: sectionTitle,
          content: sectionContent.substring(0, 1000)
        });
      }
    });

    // Extraer ejemplos de código
    const codeExamples = [];
    $('pre code').each((i, elem) => {
      codeExamples.push($(elem).text().trim());
    });

    const fullText = `${title}\n\n${description}\n\n${sections.map(s => `${s.title}\n${s.content}`).join('\n\n')}`;

    return {
      type: 'mdn',
      url,
      title,
      description,
      sections,
      codeExamples: codeExamples.slice(0, 5),
      text: fullText.substring(0, this.maxContentLength)
    };
  }

  /**
   * Extrae contenido genérico
   */
  async extractGeneric(url) {
    const response = await axios.get(url, {
      headers: { 'User-Agent': this.userAgent },
      timeout: this.timeout
    });

    const $ = cheerio.load(response.data);

    // Intentar extraer contenido principal
    const title = $('h1').first().text().trim() || $('title').text().trim();

    // Intentar múltiples selectores para contenido
    let mainContent = $('article').text().trim() ||
                      $('.content').text().trim() ||
                      $('.main').text().trim() ||
                      $('main').text().trim() ||
                      $('body').text().trim();

    // Limpiar contenido
    mainContent = this.cleanText(mainContent);

    // Extraer código
    const codeBlocks = [];
    $('pre code, code').each((i, elem) => {
      const code = $(elem).text().trim();
      if (code.length > 20) { // Ignorar snippets muy pequeños
        codeBlocks.push(code);
      }
    });

    return {
      type: 'generic',
      url,
      title,
      text: mainContent.substring(0, this.maxContentLength),
      codeBlocks: codeBlocks.slice(0, 10)
    };
  }

  /**
   * Verifica si es archivo de código
   */
  isCodeFile(filename) {
    const codeExtensions = ['.js', '.ts', '.jsx', '.tsx', '.py', '.java', '.cpp', '.c', '.go', '.rs', '.rb', '.php'];
    return codeExtensions.some(ext => filename.endsWith(ext));
  }

  /**
   * Limpia texto
   */
  cleanText(text) {
    return text
      .replace(/\s+/g, ' ')
      .replace(/\n\s*\n/g, '\n\n')
      .trim();
  }

  /**
   * Extrae múltiples URLs en paralelo
   */
  async extractMultiple(urls) {
    console.log(`📚 [Content Extractor] Extrayendo ${urls.length} URLs...`);

    const promises = urls.map(url =>
      this.extract(url).catch(err => ({
        error: err.message,
        url
      }))
    );

    const results = await Promise.all(promises);

    const successful = results.filter(r => !r.error);
    console.log(`✅ [Content Extractor] ${successful.length}/${urls.length} extraídos exitosamente`);

    return results;
  }
}

module.exports = ContentExtractor;
